import { Request, Response } from "express";
import { ReviewService } from "./review.service.js";
import { AuthRequest } from "../../middlewares/auth.middleware.js";

export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  createReview = async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).user?.id!;
    const result = await this.reviewService.createReview(userId, req.body);
    res.status(201).send(result);
  };

  createReply = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    const result = await this.reviewService.createReply(
      tenantId,
      req.params.reviewId as string,
      req.body,
    );
    res.status(201).send(result);
  };

  getReviews = async (req: Request, res: Response) => {
    const result = await this.reviewService.getReviews(req.query as any);
    res.status(200).send(result);
  };
}
