import express, { Router } from "express";
import { PropertyController } from "./property.controller.js";
import { AuthMiddleware } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../types/user-role.js";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import { uploader } from "../../middlewares/uploader.middleware.js";
import {
  CreatePropertyDto,
  GetPropertiesQueryDto,
  GetTenantPropertiesQueryDto,
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
    this.router.get("/locations", this.propertyController.getLocations);

    // Protected /tenant route MUST be defined before /:slug to prevent routing conflicts
    this.router.get(
      "/tenant",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.authMiddleware.verifyRole([UserRole.TENANT]),
      this.validationMiddleware.validateQuery(GetTenantPropertiesQueryDto),
      this.propertyController.getTenantProperties,
    );

    this.router.get("/:slug", this.propertyController.getPropertyBySlug);
    this.router.get("/id/:id", this.propertyController.getPropertyById); // Use /id/:id to avoid conflict with /:slug

    this.router.post(
      "/:id/save",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.propertyController.toggleSaveProperty,
    );

    // All subsequent routes are protected
    this.router.use(this.authMiddleware.verifyToken(process.env.JWT_SECRET!));
    this.router.use(this.authMiddleware.verifyRole([UserRole.TENANT]));

    this.router.post(
      "/",
      uploader.array("images", 5),
      this.validationMiddleware.validateBody(CreatePropertyDto),
      this.propertyController.createProperty,
    );
    this.router.patch(
      "/:id",
      uploader.array("images", 5),
      this.validationMiddleware.validateBody(UpdatePropertyDto),
      this.propertyController.updateProperty,
    );
    this.router.delete("/:id", this.propertyController.deleteProperty);
  };

  getRouter = () => this.router;
}
