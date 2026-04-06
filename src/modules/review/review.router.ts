import express, { Router } from "express";
import { ReviewController } from "./review.controller.js";
import { AuthMiddleware } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../types/user-role.js";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import {
  CreateReplyDto,
  CreateReviewDto,
  GetReviewsQueryDto,
} from "../../dto/review.dto.js";

export class ReviewRouter {
  private router: Router;
  constructor(
    private reviewController: ReviewController,
    private authMiddleware: AuthMiddleware,
    private validationMiddleware: ValidationMiddleware,
  ) {
    this.router = express.Router();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.get(
      "/",
      this.validationMiddleware.validateQuery(GetReviewsQueryDto),
      this.reviewController.getReviews,
    );

    this.router.use(this.authMiddleware.verifyToken(process.env.JWT_SECRET!));

    this.router.post(
      "/",
      this.authMiddleware.verifyRole([UserRole.USER]),
      this.validationMiddleware.validateBody(CreateReviewDto),
      this.reviewController.createReview,
    );

    this.router.post(
      "/:reviewId/reply",
      this.authMiddleware.verifyRole([UserRole.TENANT]),
      this.validationMiddleware.validateBody(CreateReplyDto),
      this.reviewController.createReply,
    );
  };

  getRouter = () => this.router;
}
