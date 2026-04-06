import express, { Router } from "express";
import { DashboardController } from "./dashboard.controller.js";
import { AuthMiddleware } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../types/user-role.js";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import { GetDashboardQueryDto } from "./dto/dashboard.dto.js";

export class DashboardRouter {
  private router: Router;
  constructor(
    private dashboardController: DashboardController,
    private authMiddleware: AuthMiddleware,
    private validationMiddleware: ValidationMiddleware,
  ) {
    this.router = express.Router();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.use(this.authMiddleware.verifyToken(process.env.JWT_SECRET!));
    this.router.use(this.authMiddleware.verifyRole([UserRole.TENANT]));

    this.router.get(
      "/summary",
      this.validationMiddleware.validateQuery(GetDashboardQueryDto),
      this.dashboardController.getSummary,
    );
    this.router.get(
      "/analytics",
      this.validationMiddleware.validateQuery(GetDashboardQueryDto),
      this.dashboardController.getAnalytics,
    );
  };

  getRouter = () => this.router;
}
