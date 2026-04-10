import express, { Router } from "express";
import { CategoryController } from "./category.controller.js";
import { AuthMiddleware } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../types/user-role.js";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import {
  CreateCategoryDto,
  GetCategoriesQueryDto,
  UpdateCategoryDto,
} from "./dto/category.dto.js";

export class CategoryRouter {
  private router: Router;
  constructor(
    private categoryController: CategoryController,
    private authMiddleware: AuthMiddleware,
    private validationMiddleware: ValidationMiddleware,
  ) {
    this.router = express.Router();
    this.initRoutes();
  }

  private initRoutes = () => {
    // Public routes
    this.router.get(
      "/",
      this.validationMiddleware.validateQuery(GetCategoriesQueryDto),
      this.categoryController.getCategories,
    );
    this.router.get("/:id", this.categoryController.getCategoryById);

    // Protected routes (tenant only)
    this.router.use(this.authMiddleware.verifyToken(process.env.JWT_SECRET!));
    this.router.use(this.authMiddleware.verifyRole([UserRole.TENANT]));

    this.router.post(
      "/",
      this.validationMiddleware.validateBody(CreateCategoryDto),
      this.categoryController.createCategory,
    );
    this.router.patch(
      "/:id",
      this.validationMiddleware.validateBody(UpdateCategoryDto),
      this.categoryController.updateCategory,
    );
    this.router.delete("/:id", this.categoryController.deleteCategory);
  };

  getRouter = () => this.router;
}
