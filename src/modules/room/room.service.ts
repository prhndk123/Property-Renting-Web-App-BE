import { PrismaClient, Prisma } from "../../generated/prisma/client.js";
import { ApiError } from "../../utils/api-error.js";
import {
  CreateRoomDto,
  GetRoomsQueryDto,
  UpdateRoomDto,
} from "../../dto/room.dto.js";

export class RoomService {
  constructor(private prisma: PrismaClient) {}

  async createRoom(tenantId: string, data: CreateRoomDto) {
    await this.verifyPropertyOwner(data.propertyId, tenantId);
    return this.prisma.room.create({
      data,
      include: { images: true },
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
      include: { property: true },
    });
    if (!room) throw new ApiError("Room not found", 404);
    if (room.property.tenantId !== tenantId)
      throw new ApiError("Unauthorized", 403);

    return this.prisma.room.update({
      where: { id },
      data,
      include: { images: true },
    });
  }

  async deleteRoom(id: string, tenantId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: { property: true },
    });
    if (!room) throw new ApiError("Room not found", 404);
    if (room.property.tenantId !== tenantId)
      throw new ApiError("Unauthorized", 403);

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
