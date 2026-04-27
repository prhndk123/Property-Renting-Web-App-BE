import {
  PrismaClient,
  Prisma,
} from "../../../generated/prisma/client/index.js";
import { ApiError } from "../../utils/api-error.js";
import {
  CreateRoomDto,
  GetRoomsQueryDto,
  UpdateRoomDto,
} from "./dto/room.dto.js";
import { CloudinaryService } from "../cloudinary/cloudinary.service.js";

export class RoomService {
  constructor(
    private prisma: PrismaClient,
    private cloudinaryService: CloudinaryService,
  ) {}

  async createRoom(tenantId: string, data: CreateRoomDto) {
    await this.verifyPropertyOwner(data.propertyId, tenantId);

    const { imageUrls, ...roomData } = data;

    return this.prisma.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: roomData,
        include: { images: true },
      });

      if (imageUrls && imageUrls.length > 0) {
        await tx.roomImage.createMany({
          data: imageUrls.map((url) => ({
            roomId: room.id,
            imageUrl: url,
          })),
        });
      }

      return tx.room.findFirst({
        where: { id: room.id, deletedAt: null },
        include: { images: true },
      });
    });
  }

  private async verifyPropertyOwner(propertyId: string, tenantId: string) {
    const prop = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
    });
    if (!prop) throw new ApiError("Property not found", 404);
    if (prop.tenantId !== tenantId) throw new ApiError("Unauthorized", 403);
    return prop;
  }

  async getRoomById(id: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, deletedAt: null },
      include: {
        images: true,
        property: { include: { images: true, category: true } },
        availability: true,
        peakSeasonRates: true,
      },
    });
    if (!room) throw new ApiError("Room not found", 404);
    return room;
  }

  async updateRoom(id: string, tenantId: string, data: UpdateRoomDto) {
    const room = await this.prisma.room.findFirst({
      where: { id, deletedAt: null },
      include: { property: true, images: true },
    });
    if (!room) throw new ApiError("Room not found", 404);
    const castedRoom = room as any;
    if (castedRoom.property.tenantId !== tenantId)
      throw new ApiError("Unauthorized", 403);

    const { imageUrls, removedImageIds, ...updateData } = data;

    return this.prisma.$transaction(async (tx) => {
      await tx.room.update({
        where: { id },
        data: updateData,
      });

      // Handle removed images
      if (removedImageIds && removedImageIds.length > 0) {
        const imagesToRemove = castedRoom.images.filter((img: any) =>
          removedImageIds.includes(img.id),
        );

        for (const img of imagesToRemove) {
          try {
            await this.cloudinaryService.removeByUrl(img.imageUrl);
          } catch (e) {
            console.error("Failed to delete room image from cloudinary:", e);
          }
        }

        await tx.roomImage.deleteMany({
          where: { id: { in: removedImageIds } },
        });
      }

      // Add new images
      if (imageUrls && imageUrls.length > 0) {
        await tx.roomImage.createMany({
          data: imageUrls.map((url) => ({
            roomId: id,
            imageUrl: url,
          })),
        });
      }

      return tx.room.findFirst({
        where: { id, deletedAt: null },
        include: { images: true },
      });
    });
  }

  async deleteRoom(id: string, tenantId: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, deletedAt: null },
      include: { property: true, images: true },
    });
    if (!room) throw new ApiError("Room not found", 404);
    const castedRoom = room as any;
    if (castedRoom.property.tenantId !== tenantId)
      throw new ApiError("Unauthorized", 403);

    // Delete all images from cloudinary
    for (const img of castedRoom.images) {
      try {
        await this.cloudinaryService.removeByUrl(img.imageUrl);
      } catch (e) {
        console.error("Failed to delete room image during room deletion:", e);
      }
    }

    await this.prisma.room.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Room deleted successfully (soft delete)" };
  }

  async getRooms(query: GetRoomsQueryDto) {
    const { page, take, propertyId } = query;
    const where: Prisma.RoomWhereInput = { propertyId, deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.room.findMany({
        where,
        take,
        skip: (page - 1) * take,
        include: { images: true },
      }),
      this.prisma.room.count({ where }),
    ]);
    return { data, meta: { page, take, total } };
  }
}
