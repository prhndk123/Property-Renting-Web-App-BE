import { PrismaClient, User } from "../../../generated/prisma/client/index.js";
import { comparePassword, hashPassword } from "../../lib/argon.js";
import { ApiError } from "../../utils/api-error.js";
import jwt from "jsonwebtoken";
import {
  RegisterDto,
  LoginDto,
  ResetPasswordDto,
  VerifyEmailDto,
  GoogleLoginDto,
  OnboardingDto,
} from "./dto/auth.dto.js";
import { MailService } from "../mail/mail.service.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/token.utils.js";
import axios from "axios";
import crypto from "crypto";

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private mailService: MailService,
  ) {}

  // ─── EMAIL REGISTER ──────────────────────────────────────────────────────────
  async register(body: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: body.email, deletedAt: null },
    });
    if (existing) throw new ApiError("Email already in use", 400);

    const user = await this.prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        role: body.role,
        password: null,
        phone: body.role === "TENANT" ? body.phone : null,
        businessName: body.role === "TENANT" ? body.businessName : null,
        provider: "email",
        isVerified: false,
      },
    });

    await this.createVerificationToken(user);

    return {
      message:
        "Register Success. Please check your email to verify your account.",
    };
  }

  private async createVerificationToken(user: User) {
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        purpose: "verify-email",
        jti: crypto.randomUUID(),
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" },
    );
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    await this.prisma.emailVerification.create({
      data: { userId: user.id, token, expiresAt },
    });
    const verifyLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-email?token=${token}`;
    return this.mailService
      .sendEmail(user.email, "Verify Your Email ✉️", "verify-email", {
        name: user.name,
        verifyLink,
      })
      .catch((e) => console.error("Verification email failed", e));
  }

  // ─── EMAIL VERIFY ─────────────────────────────────────────────────────────────
  async verifyEmail(body: VerifyEmailDto) {
    try {
      jwt.verify(body.token, process.env.JWT_SECRET!);
    } catch {
      throw new ApiError("Invalid or expired verification token", 400);
    }

    const request = await this.prisma.emailVerification.findFirst({
      where: { token: body.token, expiresAt: { gt: new Date() }, used: false },
    });
    if (!request)
      throw new ApiError("Invalid or expired verification token", 400);

    const hashedPassword = await hashPassword(body.password);

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: request.userId },
        data: { isVerified: true, password: hashedPassword },
      }),
      this.prisma.emailVerification.update({
        where: { id: request.id },
        data: { used: true },
      }),
    ]);

    // Send welcome email upon completion of email verification
    this.sendWelcomeEmail(updatedUser);

    return { message: "Email verified successfully. You can now login." };
  }

  async checkVerificationToken(token: string) {
    try {
      jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return { valid: false, message: "expired" };
    }

    const request = await this.prisma.emailVerification.findFirst({
      where: { token, expiresAt: { gt: new Date() }, used: false },
    });

    if (!request) {
      return { valid: false, message: "invalid" };
    }

    return { valid: true };
  }

  async checkResetToken(token: string) {
    try {
      jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return { valid: false, message: "expired" };
    }

    const request = await this.prisma.passwordReset.findFirst({
      where: { token, expiresAt: { gt: new Date() }, used: false },
    });

    if (!request) {
      return { valid: false, message: "invalid" };
    }

    return { valid: true };
  }

  // ─── RESEND VERIFICATION ──────────────────────────────────────────────────────
  async resendVerification(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (!user) throw new ApiError("User not found", 404);
    if (user.isVerified) throw new ApiError("Account is already verified", 400);

    // Invalidate old unused tokens
    await this.prisma.emailVerification.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    await this.createVerificationToken(user);
    return { message: "Verification email has been resent." };
  }

  // ─── EMAIL LOGIN ──────────────────────────────────────────────────────────────
  async login(body: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email, deletedAt: null },
    });

    if (!user) {
      throw new ApiError("Invalid Credential", 400);
    }

    if (!user.isVerified) {
      const lastToken = await this.prisma.emailVerification.findFirst({
        where: { userId: user.id, used: false },
        orderBy: { createdAt: "desc" },
      });

      if (lastToken && lastToken.expiresAt < new Date()) {
        throw new ApiError(
          "Tautan verifikasi telah kedaluwarsa. Silakan minta tautan baru.",
          403,
        );
      }

      throw new ApiError(
        "Akun belum diverifikasi. Silakan cek email Anda untuk membuat password.",
        403,
      );
    }

    if (
      !user.password ||
      !(await comparePassword(body.password, user.password))
    ) {
      throw new ApiError("Invalid Credential", 400);
    }

    const payload = { id: user.id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await this.saveRefreshToken(user.id, refreshToken);

    const { password, ...userWithoutPassword } = user;
    return { ...userWithoutPassword, accessToken, refreshToken };
  }

  // ─── GOOGLE LOGIN ─────────────────────────────────────────────────────────────
  async googleLogin(body: GoogleLoginDto) {
    // 1. Verify access token with Google
    let googleUser: {
      sub: string;
      name: string;
      email: string;
      picture?: string;
      email_verified?: boolean;
    };

    try {
      const response = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${body.accessToken}`,
          },
        },
      );
      googleUser = response.data;
    } catch {
      throw new ApiError("Invalid Google access token", 401);
    }

    if (!googleUser.email) {
      throw new ApiError("Google account does not have an email", 400);
    }

    // 2. Find or create user
    let user = await this.prisma.user.findFirst({
      where: { email: googleUser.email, deletedAt: null },
    });

    if (!user) {
      // Create new Google user
      user = await this.prisma.user.create({
        data: {
          name: googleUser.name,
          email: googleUser.email,
          profilePicture: googleUser.picture || null,
          password: null,
          role: null, // Must complete onboarding
          provider: "google",
          isVerified: true,
        },
      });
    } else {
      // Update existing user if needed (e.g. mark as verified if logging in via Google)
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          provider: "google", // Update provider to google to avoid password confusion
          profilePicture: user.profilePicture || googleUser.picture || null,
        },
      });
    }

    // 3. Generate tokens
    const payload = { id: user.id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await this.saveRefreshToken(user.id, refreshToken);

    const needsOnboarding = user.role === null;
    const { password, ...userWithoutPassword } = user;

    return {
      ...userWithoutPassword,
      accessToken,
      refreshToken,
      needsOnboarding,
    };
  }

  // ─── ONBOARDING ───────────────────────────────────────────────────────────────
  async onboarding(userId: string, body: OnboardingDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) throw new ApiError("User not found", 404);

    if (user.role !== null) {
      throw new ApiError("User has already completed onboarding", 400);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: body.role,
        phone: body.role === "TENANT" ? body.phone : null,
        businessName: body.role === "TENANT" ? body.businessName : null,
      },
    });

    // Send welcome email when user completes Google onboarding
    this.sendWelcomeEmail(updatedUser);

    // Re-generate tokens with updated role
    const payload = { id: updatedUser.id, role: updatedUser.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await this.saveRefreshToken(updatedUser.id, refreshToken);

    const { password, ...userWithoutPassword } = updatedUser;
    return { ...userWithoutPassword, accessToken, refreshToken };
  }

  // ─── COMMON ───────────────────────────────────────────────────────────────────
  private async sendWelcomeEmail(user: {
    email: string;
    name: string;
    role: string | null;
  }) {
    try {
      if (user.role === "TENANT") {
        await this.mailService.sendEmail(
          user.email,
          "Welcome to Rentivo! 🏢",
          "welcome-tenants",
          {
            name: user.name,
            dashboardLink: `${process.env.FRONTEND_URL || "http://localhost:5173"}/tenant`,
            year: new Date().getFullYear(),
          },
        );
      } else if (user.role === "USER") {
        await this.mailService.sendEmail(
          user.email,
          "Welcome to Rentivo! 🎉",
          "welcome",
          {
            name: user.name,
            referralCode: "NEWUSER10",
            exploreLink: `${process.env.FRONTEND_URL || "http://localhost:5173"}`,
          },
        );
      }
    } catch (e) {
      console.error("Failed to send welcome email", e);
    }
  }

  private async saveRefreshToken(userId: string, token: string) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return this.prisma.refreshToken.upsert({
      where: { userId },
      update: { token, expiredAt: expiresAt },
      create: { userId, token, expiredAt: expiresAt },
    });
  }

  async logout(token: string) {
    await this.prisma.refreshToken.delete({ where: { token } }).catch(() => {});
    return { message: "Logout success" };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) throw new ApiError("Invalid refresh token", 400);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: true,
      },
    });

    const castedStored = stored as any;
    if (
      !stored ||
      !castedStored.user ||
      castedStored.user.deletedAt ||
      stored.expiredAt < new Date()
    ) {
      throw new ApiError("Refresh token expired or invalid", 401);
    }

    return {
      accessToken: generateAccessToken({
        id: castedStored.user.id,
        role: castedStored.user.role,
      }),
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (user) {
      await this.prisma.passwordReset.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      });
      await this.createResetToken(user);
    }
    return { message: "If registered, you will receive a reset link" };
  }

  private async createResetToken(user: User) {
    const token = jwt.sign(
      { id: user.id, purpose: "reset-password", jti: crypto.randomUUID() },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" },
    );
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);
    await this.prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });
    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}`;
    return this.mailService
      .sendEmail(user.email, "Reset Password", "forgot-pass", {
        name: user.name,
        resetLink,
      })
      .catch((e) => console.error("Reset email failed", e));
  }

  async resetPassword(body: ResetPasswordDto) {
    try {
      jwt.verify(body.token, process.env.JWT_SECRET!);
    } catch {
      throw new ApiError("Invalid or expired reset token", 400);
    }

    const request = await this.prisma.passwordReset.findFirst({
      where: { token: body.token, expiresAt: { gt: new Date() }, used: false },
    });
    if (!request) throw new ApiError("Invalid or expired reset token", 400);

    const hashedPassword = await hashPassword(body.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: request.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordReset.update({
        where: { id: request.id },
        data: { used: true },
      }),
    ]);
    return { message: "Password reset successfully" };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        businessName: true,
        provider: true,
        profilePicture: true,
        isVerified: true,
        createdAt: true,
      },
    });
    if (!user) throw new ApiError("User not found", 404);
    return user;
  }
}
