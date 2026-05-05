import { PrismaClient, Prisma, User } from "@prisma/client";
import { ApiError } from "../../utils/api-error.js";
import { comparePassword, hashPassword } from "../../lib/argon.js";
import { CloudinaryService } from "../cloudinary/cloudinary.service.js";
import { MailService } from "../mail/mail.service.js";
import {
  GetUsersQueryDto,
  UpdateProfileDto,
  UpdatePasswordDto,
  CreatePaymentMethodDto,
} from "./dto/user.dto.js";

export class UserService {
  constructor(
    private prisma: PrismaClient,
    private cloudinary: CloudinaryService,
    private mail: MailService,
  ) {}

  async getUsers(query: GetUsersQueryDto) {
    const {
      page = 1,
      take = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
    } = query;
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(search && { name: { contains: search, mode: "insensitive" } }),
    };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        take,
        skip: (page - 1) * take,
        orderBy: { [sortBy]: sortOrder },
        omit: { password: true },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, meta: { page, take, total } };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      omit: { password: true },
    });
    if (!user) throw new ApiError("User not found", 404);
    return user;
  }

  async updateUser(id: string, body: Partial<User>) {
    await this.getUser(id);
    if (body.email) await this.checkEmail(body.email, id);
    await this.prisma.user.update({ where: { id }, data: body });
    return { message: "Update user success" };
  }

  private async checkEmail(email: string, excludeId?: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, id: { not: excludeId } },
    });
    if (user) throw new ApiError("Email already exists", 400);
  }

  async updatePassword(id: string, body: UpdatePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (
      !user ||
      !user.password ||
      !(await comparePassword(body.oldPassword, user.password))
    ) {
      throw new ApiError("Old password incorrect", 400);
    }
    const hashedPassword = await hashPassword(body.newPassword);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
    await this.sendPassChangedEmail(user.email, user.name);
    return { message: "Password updated successfully" };
  }

  private async sendPassChangedEmail(email: string, name: string) {
    const now = new Date();
    return this.mail
      .sendEmail(email, "Password Changed", "password-changed", {
        name,
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
      })
      .catch((e) => console.error("Mail failed", e));
  }

  async updateProfile(
    id: string,
    body: UpdateProfileDto,
    authUserId?: string,
    authUserRole?: string,
  ) {
    // Ownership check: users can only update their own profile
    if (authUserId && authUserId !== id) {
      throw new ApiError("You can only update your own profile", 403);
    }

    const current = await this.getUser(id);
    if (body.email) await this.checkEmail(body.email, id);
    if (body.profilePicture)
      await this.cleanupOldAvatar(current.profilePicture, body.profilePicture);

    // Strip businessName if user is not a TENANT
    const updateData: any = { ...body };
    if (authUserRole !== "TENANT") {
      delete updateData.businessName;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      omit: { password: true },
    });
    return { ...updated, message: "Profile updated successfully" };
  }

  private async cleanupOldAvatar(oldUrl: string | null, newUrl: string) {
    if (oldUrl && oldUrl !== newUrl) await this.cloudinary.removeByUrl(oldUrl);
  }

  async deleteUser(id: string) {
    await this.getUser(id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Delete user success (soft delete)" };
  }

  async getSavedProperties(userId: string) {
    const saved = await this.prisma.savedProperty.findMany({
      where: { userId, deletedAt: null },
      include: {
        property: {
          include: {
            category: true,
            images: true,
            reviews: {
              select: { rating: true },
            },
            rooms: {
              select: { basePrice: true },
              orderBy: { basePrice: "asc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return saved.map((s: any) => {
      const p = s.property;
      const reviewCount = p.reviews.length;
      const averageRating =
        reviewCount > 0
          ? p.reviews.reduce((acc: number, curr: any) => acc + curr.rating, 0) /
            reviewCount
          : 0;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        city: p.city,
        category: p.category,
        images: p.images,
        lowestPrice: p.rooms.length > 0 ? Number(p.rooms[0].basePrice) : 0,
        isAvailable: true,
        averageRating,
        reviewCount,
      };
    });
  }

  async getSavedPropertyIds(userId: string) {
    const saved = await this.prisma.savedProperty.findMany({
      where: { userId, deletedAt: null },
      select: { propertyId: true },
    });
    return saved.map((s: any) => s.propertyId);
  }

  async addPaymentMethod(userId: string, body: CreatePaymentMethodDto) {
    const lastFour = body.cardNumber.slice(-4);
    return this.prisma.savedPaymentMethod.create({
      data: {
        userId,
        cardName: body.cardName,
        lastFour,
        expiry: body.expiry,
        brand: body.brand || "Visa",
      },
    });
  }

  async getPaymentMethods(userId: string) {
    return this.prisma.savedPaymentMethod.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  async deletePaymentMethod(userId: string, methodId: string) {
    const method = await this.prisma.savedPaymentMethod.findUnique({
      where: { id: methodId, deletedAt: null },
    });
    if (!method || method.userId !== userId)
      throw new ApiError("Payment method not found", 404);

    await this.prisma.savedPaymentMethod.update({
      where: { id: methodId },
      data: { deletedAt: new Date() },
    });
    return { message: "Payment method deleted (soft delete)" };
  }
}
