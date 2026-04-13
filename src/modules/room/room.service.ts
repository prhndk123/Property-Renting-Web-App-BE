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

      return tx.room.findUnique({
        where: { id: room.id },
        include: { images: true },
      });
    });
  }

  private async verifyPropertyOwner(propertyId: string, tenantId: string) {
    const prop = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!prop) throw new ApiError("Property not found", 404);
    if (prop.tenantId !== tenantId) throw new ApiError("Unauthorized", 403);
    return prop;
  }

  async getRoomById(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
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
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: { property: true, images: true },
    });
    if (!room) throw new ApiError("Room not found", 404);
    if (room.property.tenantId !== tenantId)
      throw new ApiError("Unauthorized", 403);

    const { imageUrls, removedImageIds, ...updateData } = data;

    return this.prisma.$transaction(async (tx) => {
      await tx.room.update({
        where: { id },
        data: updateData,
      });

      // Handle removed images
      if (removedImageIds && removedImageIds.length > 0) {
        const imagesToRemove = room.images.filter((img) =>
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

      return tx.room.findUnique({
        where: { id },
        include: { images: true },
      });
    });
  }

  async deleteRoom(id: string, tenantId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: { property: true, images: true },
    });
    if (!room) throw new ApiError("Room not found", 404);
    if (room.property.tenantId !== tenantId)
      throw new ApiError("Unauthorized", 403);

    // Delete all images from cloudinary
    for (const img of room.images) {
      try {
        await this.cloudinaryService.removeByUrl(img.imageUrl);
      } catch (e) {
        console.error("Failed to delete room image during room deletion:", e);
      }
    }

    await this.prisma.room.delete({ where: { id } });
    return { message: "Room deleted successfully" };
  }

  async getRooms(query: GetRoomsQueryDto) {
    const { page, take, propertyId } = query;
    const where: Prisma.RoomWhereInput = { propertyId };
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
