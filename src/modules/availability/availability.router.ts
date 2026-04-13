import express, { Router } from "express";
import { AvailabilityController } from "./availability.controller.js";
import { AuthMiddleware } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../types/user-role.js";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import {
  BulkSetAvailabilityDto,
  SetAvailabilityDto,
  SetPeakRateDto,
  UpdatePeakRateDto,
} from "./dto/availability.dto.js";

export class AvailabilityRouter {
  private router: Router;
  constructor(
    private availabilityController: AvailabilityController,
    private authMiddleware: AuthMiddleware,
    private validationMiddleware: ValidationMiddleware,
  ) {
    this.router = express.Router();
    this.initRoutes();
  }

  private initRoutes = () => {
    // Public routes
    this.router.get("/:roomId", this.availabilityController.getAvailability);
    this.router.get(
      "/:roomId/peak-rates",
      this.availabilityController.getPeakRates,
    );
    this.router.get(
      "/:roomId/total-price",
      this.availabilityController.calculateTotalPrice,
    );

    // Protected routes (tenant only)
    this.router.use(this.authMiddleware.verifyToken(process.env.JWT_SECRET!));
    this.router.use(this.authMiddleware.verifyRole([UserRole.TENANT]));

    this.router.post(
      "/:roomId",
      this.validationMiddleware.validateBody(SetAvailabilityDto),
      this.availabilityController.setRoomAvailability,
    );
    this.router.post(
      "/:roomId/bulk",
      this.validationMiddleware.validateBody(BulkSetAvailabilityDto),
      this.availabilityController.bulkSetAvailability,
    );
    this.router.post(
      "/:roomId/peak-rates",
      this.validationMiddleware.validateBody(SetPeakRateDto),
      this.availabilityController.setPeakSeasonRate,
    );
    this.router.patch(
      "/peak-rates/:id",
      this.validationMiddleware.validateBody(UpdatePeakRateDto),
      this.availabilityController.updatePeakRate,
    );
    this.router.delete(
      "/peak-rates/:id",
      this.availabilityController.deletePeakRate,
    );
  };

  getRouter = () => this.router;
}
