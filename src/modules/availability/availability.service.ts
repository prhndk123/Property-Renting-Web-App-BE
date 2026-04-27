import { PrismaClient } from "../../../generated/prisma/client/index.js";
import { ApiError } from "../../utils/api-error.js";
import {
  BulkSetAvailabilityDto,
  SetAvailabilityDto,
  SetPeakRateDto,
  UpdatePeakRateDto,
} from "./dto/availability.dto.js";

export class AvailabilityService {
  constructor(private prisma: PrismaClient) {}

  async setRoomAvailability(
    roomId: string,
    tenantId: string,
    item: SetAvailabilityDto,
  ) {
    const room = await this.verifyRoomOwner(roomId, tenantId);
    const dateStr = new Date(item.date).toISOString().split("T")[0];
    const date = new Date(`${dateStr}T00:00:00Z`);

    return this.prisma.roomInventory.upsert({
      where: { roomId_date: { roomId, date } },
      update: { totalStock: item.isAvailable ? room.qty : 0 },
      create: {
        roomId,
        date,
        totalStock: item.isAvailable ? room.qty : 0,
        bookedStock: 0,
      },
    });
  }

  async bulkSetAvailability(
    roomId: string,
    tenantId: string,
    data: BulkSetAvailabilityDto,
  ) {
    const room = await this.verifyRoomOwner(roomId, tenantId);

    const results = await this.prisma.$transaction(
      data.items.map((item) => {
        const dateStr = new Date(item.date).toISOString().split("T")[0];
        const date = new Date(`${dateStr}T00:00:00Z`);

        return this.prisma.roomInventory.upsert({
          where: { roomId_date: { roomId, date } },
          update: { totalStock: item.isAvailable ? room.qty : 0 },
          create: {
            roomId,
            date,
            totalStock: item.isAvailable ? room.qty : 0,
            bookedStock: 0,
          },
        });
      }),
    );

    return {
      message: `Successfully updated ${results.length} availability entries`,
      count: results.length,
    };
  }

  private async verifyRoomOwner(roomId: string, tenantId: string) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, deletedAt: null },
      include: { property: true },
    });
    if (!room || !room.property || room.property.tenantId !== tenantId)
      throw new ApiError("Forbidden", 403);
    return room;
  }

  async setPeakSeasonRate(
    roomId: string,
    tenantId: string,
    data: SetPeakRateDto,
  ) {
    await this.verifyRoomOwner(roomId, tenantId);
    return this.prisma.peakSeasonRate.create({
      data: {
        roomId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        priceType: data.priceType as any,
        value: data.value,
      },
    });
  }

  async updatePeakRate(id: string, tenantId: string, data: UpdatePeakRateDto) {
    const rate = await this.prisma.peakSeasonRate.findFirst({
      where: { id, deletedAt: null },
      include: {
        room: {
          include: { property: true },
        },
      },
    });
    const castedRate = rate as any;
    if (!rate || !castedRate.room || !castedRate.room.property)
      throw new ApiError("Peak rate not found", 404);
    if (castedRate.room.property.tenantId !== tenantId)
      throw new ApiError("Unauthorized", 403);

    const updateData: any = {};
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    if (data.priceType) updateData.priceType = data.priceType;
    if (data.value !== undefined) updateData.value = data.value;

    return this.prisma.peakSeasonRate.update({
      where: { id },
      data: updateData,
    });
  }

  async deletePeakRate(id: string, tenantId: string) {
    const rate = await this.prisma.peakSeasonRate.findFirst({
      where: { id, deletedAt: null },
      include: {
        room: {
          include: { property: true },
        },
      },
    });
    const castedRate = rate as any;
    if (!rate || !castedRate.room || !castedRate.room.property)
      throw new ApiError("Peak rate not found", 404);
    if (castedRate.room.property.tenantId !== tenantId)
      throw new ApiError("Unauthorized", 403);

    await this.prisma.peakSeasonRate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Peak rate deleted successfully (soft delete)" };
  }

  async calculateTotalPrice(roomId: string, startDate: Date, endDate: Date) {
    const room = await this.verifyRoomAvailable(roomId, startDate, endDate);
    const nights = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24),
    );
    let totalPrice = 0;

    for (let i = 0; i < nights; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      totalPrice += this.getDailyPrice(room, date);
    }

    return {
      roomId,
      startDate,
      endDate,
      nights,
      totalPrice,
      basePrice: room.basePrice as any,
    };
  }

  private getDailyPrice(room: any, date: Date) {
    const dStr = date.toISOString().split("T")[0];
    const dTime = new Date(`${dStr}T00:00:00Z`).getTime();

    const rate = room.peakSeasonRates.find((r: any) => {
      const rStartStr = new Date(r.startDate).toISOString().split("T")[0];
      const rEndStr = new Date(r.endDate).toISOString().split("T")[0];
      const rStart = new Date(`${rStartStr}T00:00:00Z`).getTime();
      const rEnd = new Date(`${rEndStr}T00:00:00Z`).getTime();
      return dTime >= rStart && dTime <= rEnd;
    });

    const base = Number(room.basePrice);
    if (!rate) return base;
    return rate.priceType === "NOMINAL"
      ? Number(rate.value)
      : base + (base * Number(rate.value)) / 100;
  }

  private async verifyRoomAvailable(roomId: string, start: Date, end: Date) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, deletedAt: null },
      include: {
        peakSeasonRates: { where: { deletedAt: null } },
        inventories: true,
        property: true,
      },
    });
    if (!room || !room.property) throw new ApiError("Room not found", 404);

    const castedRoom = room as any;

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split("T")[0];
      const inv = castedRoom.inventories.find(
        (i: any) => i.date.toISOString().split("T")[0] === dStr,
      );
      const totalStock = inv?.totalStock === 0 ? 0 : castedRoom.qty;
      const bookedStock = inv?.bookedStock ?? 0;
      if (totalStock - bookedStock < 1) {
        throw new ApiError("Room not available", 400);
      }
    }

    return room;
  }

  async getPeakRates(roomId: string) {
    return this.prisma.peakSeasonRate.findMany({
      where: { roomId, deletedAt: null },
      orderBy: { startDate: "asc" },
    });
  }

  async getAvailability(roomId: string, month: number, year: number) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, deletedAt: null },
    });
    if (!room) return [];

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const inventories = await this.prisma.roomInventory.findMany({
      where: { roomId, date: { gte: start, lte: end } },
    });

    // Map inventories to the format frontend calendar expects
    return inventories.map((inv) => ({
      id: inv.id,
      roomId: inv.roomId,
      date: inv.date,
      isAvailable:
        (inv.totalStock === 0 ? 0 : (room as any).qty) - inv.bookedStock > 0,
    }));
  }
}
