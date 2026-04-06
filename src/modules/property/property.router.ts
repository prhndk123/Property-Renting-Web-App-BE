import express, { Router } from "express";
import { PropertyController } from "./property.controller.js";
import { AuthMiddleware } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../types/user-role.js";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import {
  CreatePropertyDto,
  GetPropertiesQueryDto,
  UpdatePropertyDto,
} from "./dto/property.dto.js";

export class PropertyRouter {
  private router: Router;
  constructor(
    private propertyController: PropertyController,
    private authMiddleware: AuthMiddleware,
    private validationMiddleware: ValidationMiddleware,
  ) {
    this.router = express.Router();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.get(
      "/",
      this.validationMiddleware.validateQuery(GetPropertiesQueryDto),
      this.propertyController.getProperties,
    );
    this.router.get("/categories", this.propertyController.getCategories);
    this.router.get("/:slug", this.propertyController.getPropertyBySlug);

    this.router.use(this.authMiddleware.verifyToken(process.env.JWT_SECRET!));
    this.router.use(this.authMiddleware.verifyRole([UserRole.TENANT]));

    this.router.post(
      "/",
      this.validationMiddleware.validateBody(CreatePropertyDto),
      this.propertyController.createProperty,
    );
    this.router.patch(
      "/:id",
      this.validationMiddleware.validateBody(UpdatePropertyDto),
      this.propertyController.updateProperty,
    );
    this.router.delete("/:id", this.propertyController.deleteProperty);
  };

  getRouter = () => this.router;
}
