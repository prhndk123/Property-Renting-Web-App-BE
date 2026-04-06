import { Request, Response } from "express";
import { AvailabilityService } from "./availability.service.js";
import { AuthRequest } from "../../middlewares/auth.middleware.js";

export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  setRoomAvailability = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    const result = await this.availabilityService.setRoomAvailability(
      req.params.roomId as string,
      tenantId,
      req.body,
    );
    res.status(200).send(result);
  };

  setPeakSeasonRate = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    const result = await this.availabilityService.setPeakSeasonRate(
      req.params.roomId as string,
      tenantId,
      req.body,
    );
    res.status(201).send(result);
  };

  calculateTotalPrice = async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    const result = await this.availabilityService.calculateTotalPrice(
      req.params.roomId as string,
      new Date(startDate as string),
      new Date(endDate as string),
    );
    res.status(200).send(result);
  };

  getPeakRates = async (req: Request, res: Response) => {
    const result = await this.availabilityService.getPeakRates(
      req.params.roomId as string,
    );
    res.status(200).send(result);
  };

  getAvailability = async (req: Request, res: Response) => {
    const { month, year } = req.query;
    const result = await this.availabilityService.getAvailability(
      req.params.roomId as string,
      Number(month),
      Number(year),
    );
    res.status(200).send(result);
  };
}
