import {
  PrismaClient,
  Prisma,
  User,
} from "../../../generated/prisma/client/index.js";
import { ApiError } from "../../utils/api-error.js";
import { comparePassword, hashPassword } from "../../lib/argon.js";
import { CloudinaryService } from "../cloudinary/cloudinary.service.js";
import { MailService } from "../mail/mail.service.js";
import {
  GetUsersQueryDto,
  UpdateProfileDto,
  UpdatePasswordDto,
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
    const where: Prisma.UserWhereInput = search
      ? { name: { contains: search, mode: "insensitive" } }
      : {};
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
      where: { id },
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
    if (!user || !user.password || !(await comparePassword(body.oldPassword, user.password))) {
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

  async updateProfile(id: string, body: UpdateProfileDto) {
    const current = await this.getUser(id);
    if (body.email) await this.checkEmail(body.email, id);
    if (body.profilePicture)
      await this.cleanupOldAvatar(current.profilePicture, body.profilePicture);

    const updated = await this.prisma.user.update({
      where: { id },
      data: body,
      omit: { password: true },
    });
    return { ...updated, message: "Profile updated successfully" };
  }

  private async cleanupOldAvatar(oldUrl: string | null, newUrl: string) {
    if (oldUrl && oldUrl !== newUrl) await this.cloudinary.removeByUrl(oldUrl);
  }

  async deleteUser(id: string) {
    await this.getUser(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: "Delete user success" };
  }
}
