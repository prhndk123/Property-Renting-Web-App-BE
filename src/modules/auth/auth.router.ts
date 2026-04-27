import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import { AuthController } from "./auth.controller.js";
import express, { Router } from "express";
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  GoogleLoginDto,
  OnboardingDto,
  ResendVerificationDto,
} from "./dto/auth.dto.js";

import { AuthMiddleware } from "../../middlewares/auth.middleware.js";

export class AuthRouter {
  private router: Router;
  constructor(
    private authController: AuthController,
    private authMiddleware: AuthMiddleware,
    private validationMiddleware: ValidationMiddleware,
  ) {
    this.router = express.Router();
    this.initRoutes();
  }
  private initRoutes = () => {
    this.router.post(
      "/register",
      this.validationMiddleware.validateBody(RegisterDto),
      this.authController.register,
    );
    this.router.post(
      "/login",
      this.validationMiddleware.validateBody(LoginDto),
      this.authController.login,
    );
    this.router.post(
      "/google",
      this.validationMiddleware.validateBody(GoogleLoginDto),
      this.authController.googleLogin,
    );
    this.router.post(
      "/onboarding",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.validationMiddleware.validateBody(OnboardingDto),
      this.authController.onboarding,
    );
    this.router.post(
      "/forgot-password",
      this.validationMiddleware.validateBody(ForgotPasswordDto),
      this.authController.forgotPassword,
    );
    this.router.post(
      "/reset-password",
      this.validationMiddleware.validateBody(ResetPasswordDto),
      this.authController.resetPassword,
    );
    this.router.post(
      "/verify-email",
      this.validationMiddleware.validateBody(VerifyEmailDto),
      this.authController.verifyEmail,
    );
    this.router.post(
      "/check-verification-token",
      this.authController.checkVerificationToken,
    );
    this.router.post("/check-reset-token", this.authController.checkResetToken);
    this.router.post(
      "/resend-verification",
      this.validationMiddleware.validateBody(ResendVerificationDto),
      this.authController.resendVerification,
    );
    this.router.post("/refresh", this.authController.refresh);
    this.router.post("/logout", this.authController.logout);
    this.router.get(
      "/profile",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.authController.getProfile,
    );
  };
  getRouter = () => {
    return this.router;
  };
}
