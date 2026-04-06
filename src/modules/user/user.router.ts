import express, { Router } from "express";
import { UserController } from "./user.controller.js";
import { AuthMiddleware } from "../../middlewares/auth.middleware.js";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import {
  GetUsersQueryDto,
  UpdatePasswordDto,
  UpdateProfileDto,
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
    this.router.get(
      "/",
      this.validationMiddleware.validateQuery(GetUsersQueryDto),
      this.userController.getUsers,
    );
    this.router.get("/:id", this.userController.getUser);
    this.router.patch("/:id", this.userController.updateUser);
    this.router.patch(
      "/:id/password",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.validationMiddleware.validateBody(UpdatePasswordDto),
      this.userController.updatePassword,
    );
    this.router.patch(
      "/:id/profile",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.validationMiddleware.validateBody(UpdateProfileDto),
      this.userController.updateProfile,
    );
    this.router.delete("/:id", this.userController.deleteUser);
  };

  getRouter = () => {
    return this.router;
  };
}
