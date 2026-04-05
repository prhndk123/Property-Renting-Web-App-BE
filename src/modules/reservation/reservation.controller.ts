import { Request, Response } from "express";
import { ReservationService } from "./reservation.service.js";
import { AuthRequest } from "../../middlewares/auth.middleware.js";

export class ReservationController {
  constructor(private svc: ReservationService) {}

  createReservation = async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).user?.id!;
    const result = await this.svc.createReservation(userId, req.body);
    res.status(201).send(result);
  };

  getReservations = async (req: Request, res: Response) => {
    const user = (req as AuthRequest).user!;
    const result = await this.svc.getReservations(
      user.id,
      user.role,
      req.query as any,
    );
    res.status(200).send(result);
  };

  uploadPaymentProof = async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).user?.id!;
    const result = await this.svc.uploadPaymentProof(
      req.params.id as string,
      userId,
      req.body.paymentProof,
    );
    res.status(200).send(result);
  };

  confirmPayment = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    const result = await this.svc.confirmPayment(
      req.params.id as string,
      tenantId,
      req.body.confirm,
    );
    res.status(200).send(result);
  };

  cancelReservation = async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).user?.id!;
    const result = await this.svc.cancelReservation(
      req.params.id as string,
      userId,
    );
    res.status(200).send(result);
  };

  cancelReservationByTenant = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    const result = await this.svc.cancelReservationByTenant(
      req.params.id as string,
      tenantId,
    );
    res.status(200).send(result);
  };

  xenditWebhook = async (req: Request, res: Response) => {
    try {
      await this.svc.handleXenditWebhook(req.body);
      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).send("Error");
    }
  };
}
