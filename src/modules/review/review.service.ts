import { PrismaClient, Prisma } from "../../generated/prisma/client.js";
import { ApiError } from "../../utils/api-error.js";
import {
  CreateReplyDto,
  CreateReviewDto,
  GetReviewsQueryDto,
} from "../../dto/review.dto.js";

export class ReviewService {
  constructor(private prisma: PrismaClient) {}

  async createReview(userId: string, data: CreateReviewDto) {
    const res = await this.verifyReservationForReview(
      data.reservationId,
      userId,
    );
    return this.prisma.review.create({
      data: { ...data, propertyId: res.propertyId, userId },
    });
  }

  private async verifyReservationForReview(
    reservationId: string,
    userId: string,
  ) {
    const res = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!res || res.userId !== userId)
      throw new ApiError("Reservation not found", 404);
    if (res.status !== "CONFIRMED" && res.status !== "COMPLETED")
      throw new ApiError("Cannot review yet", 400);
    if (new Date() < res.checkoutDate)
      throw new ApiError("Can only review after checkout date", 400);

    const existing = await this.prisma.review.findUnique({
      where: { reservationId },
    });
    if (existing) throw new ApiError("Already reviewed", 400);
    return res;
  }

  async createReply(tenantId: string, reviewId: string, data: CreateReplyDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { reservation: { include: { property: true } } },
    });
    if (!review) throw new ApiError("Review not found", 404);
    if (review.reservation.property.tenantId !== tenantId)
      throw new ApiError("Forbidden", 403);

    return this.prisma.reviewReply.create({
      data: { reviewId, tenantId, ...data },
    });
  }

  async getReviews(query: GetReviewsQueryDto) {
    const { page, take, propertyId, userId } = query;
    const where: Prisma.ReviewWhereInput = { propertyId, userId };
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        take,
        skip: (page - 1) * take,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, profilePicture: true } },
          reply: true,
        },
      }),
      this.prisma.review.count({ where }),
    ]);
    return { data, meta: { page, take, total } };
  }
}
