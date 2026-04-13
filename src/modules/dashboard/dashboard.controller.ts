import { Request, Response } from "express";
import { DashboardService } from "./dashboard.service.js";
import { AuthRequest } from "../../middlewares/auth.middleware.js";

export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  getSummary = async (req: Request, res: Response) => {
    const user = (req as AuthRequest).user!;
    const { startDate, endDate } = req.query as any;
    const result = await this.dashboardService.getSummary(
      user.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    res.status(200).send(result);
  };

  getAnalytics = async (req: Request, res: Response) => {
    const user = (req as AuthRequest).user!;
    const { startDate, endDate } = req.query as any;
    const result = await this.dashboardService.getAnalytics(
      user.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    res.status(200).send(result);
  };

  getSalesReport = async (req: Request, res: Response) => {
    const user = (req as AuthRequest).user!;
    const { startDate, endDate } = req.query as any;
    const result = await this.dashboardService.getSalesReport(
      user.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    res.status(200).send(result);
  };

  getPropertyCalendar = async (req: Request, res: Response) => {
    const user = (req as AuthRequest).user!;
    const { month, year } = req.query as any;
    const result = await this.dashboardService.getPropertyCalendar(
      user.id,
      parseInt(month),
      parseInt(year),
    );
    res.status(200).send(result);
  };
}
