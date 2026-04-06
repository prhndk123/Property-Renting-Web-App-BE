import express, { Router } from "express";
import { ReservationController } from "./reservation.controller.js";
import { AuthMiddleware } from "../../middlewares/auth.middleware.js";
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
    // Public webhook (no auth)
    this.router.post("/webhook/xendit", this.ctrl.xenditWebhook);

    // Authenticated routes
    this.router.use(this.authMiddleware.verifyToken(process.env.JWT_SECRET!));

    this.router.get(
      "/",
      this.validationMiddleware.validateQuery(GetReservationsQueryDto),
      this.ctrl.getReservations,
    );
    this.router.post(
      "/",
      this.validationMiddleware.validateBody(CreateReservationDto),
      this.ctrl.createReservation,
    );
    this.router.patch("/:id/payment-proof", this.ctrl.uploadPaymentProof);
    this.router.patch("/:id/confirm", this.ctrl.confirmPayment);
    this.router.post("/:id/cancel", this.ctrl.cancelReservation);
    this.router.post("/:id/tenant-cancel", this.ctrl.cancelReservationByTenant);
  };

  getRouter = () => this.router;
}
