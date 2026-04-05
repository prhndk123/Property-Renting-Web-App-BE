import { PrismaClient, User } from "../../generated/prisma/client.js";
import { comparePassword, hashPassword } from "../../lib/argon.js";
import { ApiError } from "../../utils/api-error.js";
import crypto from "crypto";
import { RegisterDto, LoginDto, ResetPasswordDto } from "../../dto/auth.dto.js";
import { MailService } from "../mail/mail.service.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/token.utils.js";

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private mailService: MailService,
  ) {}

  async register(body: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) throw new ApiError("Email Already Exist", 400);

    const hashedPassword = await hashPassword(body.password);
    const user = await this.prisma.user.create({
      data: { ...body, password: hashedPassword },
    });

    await this.sendWelcomeEmail(user);
    return { message: "Register Success" };
  }

  private async sendWelcomeEmail(user: User) {
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return this.mailService
      .sendEmail(user.email, "Welcome! 🎉", "welcome", {
        name: user.name,
        role: user.role,
        loginLink: `${baseUrl}/login`,
      })
      .catch((e) => console.error("Email failed", e));
  }

  async login(body: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
    });
    if (!user || !(await comparePassword(body.password, user.password))) {
      throw new ApiError("Invalid Credential", 400);
    }

    const payload = { id: user.id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await this.saveRefreshToken(user.id, refreshToken);
    return { ...user, accessToken, refreshToken };
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
      include: { user: true },
    });

    if (!stored || stored.expiredAt < new Date()) {
      throw new ApiError("Refresh token expired or invalid", 401);
    }

    return {
      accessToken: generateAccessToken({
        id: stored.user.id,
        role: stored.user.role,
      }),
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) await this.createResetToken(user);
    return { message: "If registered, you will receive a reset link" };
  }

  private async createResetToken(user: User) {
    const token = crypto.randomBytes(32).toString("hex");
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicture: true,
        createdAt: true,
      },
    });
    if (!user) throw new ApiError("User not found", 404);
    return user;
  }
}
