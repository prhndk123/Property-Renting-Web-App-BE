import express, { Router } from "express";
import { AvailabilityController } from "./availability.controller.js";
import { AuthMiddleware } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../types/user-role.js";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import {
  SetAvailabilityDto,
  SetPeakRateDto,
} from "../../dto/availability.dto.js";

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
    this.router.get("/:roomId", this.availabilityController.getAvailability);
    this.router.get(
      "/:roomId/peak-rates",
      this.availabilityController.getPeakRates,
    );
    this.router.get(
      "/:roomId/total-price",
      this.availabilityController.calculateTotalPrice,
    );

    this.router.use(this.authMiddleware.verifyToken(process.env.JWT_SECRET!));
    this.router.use(this.authMiddleware.verifyRole([UserRole.TENANT]));

    this.router.post(
      "/:roomId",
      this.validationMiddleware.validateBody(SetAvailabilityDto),
      this.availabilityController.setRoomAvailability,
    );
    this.router.post(
      "/:roomId/peak-rates",
      this.validationMiddleware.validateBody(SetPeakRateDto),
      this.availabilityController.setPeakSeasonRate,
    );
  };

  getRouter = () => this.router;
}
