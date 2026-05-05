import express, { Router } from "express";
import { ReservationController } from "./reservation.controller.js";
import { AuthMiddleware } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../types/user-role.js";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import {
  CreateReservationDto,
  GetReservationsQueryDto,
} from "./dto/reservation.dto.js";

export class ReservationRouter {
  private router: Router;
  constructor(
    private ctrl: ReservationController,
    private authMiddleware: AuthMiddleware,
    private validationMiddleware: ValidationMiddleware,
  ) {
    this.router = express.Router();
    this.initRoutes();
  }

  private initRoutes = () => {
    // Authenticated routes
    this.router.use(this.authMiddleware.verifyToken(process.env.JWT_SECRET!));

    this.router.get(
      "/",
      this.validationMiddleware.validateQuery(GetReservationsQueryDto),
      this.ctrl.getReservations,
    );
    this.router.get(
      "/my",
      this.validationMiddleware.validateQuery(GetReservationsQueryDto),
      this.ctrl.getReservations,
    );
    this.router.post(
      "/",
      this.authMiddleware.verifyRole([UserRole.USER, UserRole.TENANT]),
      this.validationMiddleware.validateBody(CreateReservationDto),
      this.ctrl.createReservation,
    );
    this.router.get("/:id", this.ctrl.getReservationById);
    this.router.patch(
      "/:id/payment-proof",
      this.authMiddleware.verifyRole([UserRole.USER]),
      this.ctrl.uploadPaymentProof,
    );
    this.router.patch(
      "/:id/confirm",
      this.authMiddleware.verifyRole([UserRole.TENANT]),
      this.ctrl.confirmPayment,
    );
    this.router.post("/:id/cancel", this.ctrl.cancelReservation);
    this.router.post(
      "/:id/tenant-cancel",
      this.authMiddleware.verifyRole([UserRole.TENANT]),
      this.ctrl.cancelReservationByTenant,
    );
  };

  getRouter = () => this.router;
}
