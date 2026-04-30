import express, { Router } from "express";
import { UserController } from "./user.controller.js";
import { AuthMiddleware } from "../../middlewares/auth.middleware.js";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import {
  GetUsersQueryDto,
  UpdatePasswordDto,
  UpdateProfileDto,
  CreatePaymentMethodDto,
} from "./dto/user.dto.js";

export class UserRouter {
  private router: Router;

  constructor(
    private userController: UserController,
    private authMiddleware: AuthMiddleware,
    private validationMiddleware: ValidationMiddleware,
  ) {
    this.router = express.Router();
    this.initRoutes();
  }

  private initRoutes = () => {
    // All user routes require authentication
    this.router.use(this.authMiddleware.verifyToken(process.env.JWT_SECRET!));

    this.router.get(
      "/",
      this.validationMiddleware.validateQuery(GetUsersQueryDto),
      this.userController.getUsers,
    );
    this.router.get(
      "/me/saved-properties",
      this.userController.getSavedProperties,
    );
    this.router.get(
      "/me/saved-properties/ids",
      this.userController.getSavedPropertyIds,
    );
    this.router.get(
      "/me/payment-methods",
      this.userController.getPaymentMethods,
    );
    this.router.post(
      "/me/payment-methods",
      this.validationMiddleware.validateBody(CreatePaymentMethodDto),
      this.userController.addPaymentMethod,
    );
    this.router.delete(
      "/me/payment-methods/:methodId",
      this.userController.deletePaymentMethod,
    );
    this.router.get("/:id", this.userController.getUser);
    this.router.patch(
      "/:id/password",
      this.validationMiddleware.validateBody(UpdatePasswordDto),
      this.userController.updatePassword,
    );
    this.router.patch(
      "/:id/profile",
      this.validationMiddleware.validateBody(UpdateProfileDto),
      this.userController.updateProfile,
    );
  };

  getRouter = () => {
    return this.router;
  };
}
