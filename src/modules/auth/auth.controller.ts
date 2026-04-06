import { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { cookieOptions } from "../../config/cookie.js";
import { ApiError } from "../../utils/api-error.js";
import { AuthRequest } from "../../middlewares/auth.middleware.js";

export class AuthController {
  constructor(private authService: AuthService) {}

  register = async (req: Request, res: Response) => {
    const body = req.body;
    const result = await this.authService.register(body);
    res.status(200).send(result);
  };

  login = async (req: Request, res: Response) => {
    const body = req.body;
    const result = await this.authService.login(body);

    res.cookie("accessToken", result.accessToken, cookieOptions);
    res.cookie("refreshToken", result.refreshToken, cookieOptions);
    const { refreshToken, accessToken, password, ...response } = result as any;
    res.status(200).send(response);
  };

  logout = async (req: Request, res: Response) => {
    const { refreshToken } = req.cookies;
    const result = await this.authService.logout(refreshToken);
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
    res.status(200).send(result);
  };
  refresh = async (req: Request, res: Response) => {
    const { refreshToken } = req.cookies;
    const result = await this.authService.refresh(refreshToken);
    res.cookie("accessToken", result.accessToken, cookieOptions);
    res.status(200).send({ message: "Refresh success" });
  };

  forgotPassword = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.forgotPassword(req.body.email);
      res.status(200).send(result);
    } catch (error) {
      res.status(500).send({ message: "Internal server error" });
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    const result = await this.authService.resetPassword(req.body);
    res.status(200).send(result);
  };

  verifyEmail = async (req: Request, res: Response) => {
    const { token } = req.body;
    const result = await this.authService.verifyEmail(token);
    res.status(200).send(result);
  };

  getProfile = async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      throw new ApiError("Unauthorized", 401);
    }
    const result = await this.authService.getProfile(userId);
    res.status(200).send(result);
  };
}
