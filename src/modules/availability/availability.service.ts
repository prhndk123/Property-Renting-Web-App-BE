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
    await this.verifyRoomOwner(roomId, tenantId);
    return this.prisma.roomAvailability.upsert({
      where: { roomId_date: { roomId, date: new Date(item.date) } },
      update: { isAvailable: item.isAvailable },
      create: {
        roomId,
        date: new Date(item.date),
        isAvailable: item.isAvailable,
      },
    });
  }

  async bulkSetAvailability(
    roomId: string,
    tenantId: string,
    data: BulkSetAvailabilityDto,
  ) {
    await this.verifyRoomOwner(roomId, tenantId);

    const results = await this.prisma.$transaction(
      data.items.map((item) =>
        this.prisma.roomAvailability.upsert({
          where: { roomId_date: { roomId, date: new Date(item.date) } },
          update: { isAvailable: item.isAvailable },
          create: {
            roomId,
            date: new Date(item.date),
            isAvailable: item.isAvailable,
          },
        }),
      ),
    );

    return {
      message: `Successfully updated ${results.length} availability entries`,
      count: results.length,
    };
  }

  private async verifyRoomOwner(roomId: string, tenantId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { property: true },
    });
    if (!room || room.property.tenantId !== tenantId)
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
    const rate = await this.prisma.peakSeasonRate.findUnique({
      where: { id },
      include: { room: { include: { property: true } } },
    });
    if (!rate) throw new ApiError("Peak rate not found", 404);
    if (rate.room.property.tenantId !== tenantId)
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
    const rate = await this.prisma.peakSeasonRate.findUnique({
      where: { id },
      include: { room: { include: { property: true } } },
    });
    if (!rate) throw new ApiError("Peak rate not found", 404);
    if (rate.room.property.tenantId !== tenantId)
      throw new ApiError("Unauthorized", 403);

    await this.prisma.peakSeasonRate.delete({ where: { id } });
    return { message: "Peak rate deleted successfully" };
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
      basePrice: room.basePrice,
    };
  }

  private getDailyPrice(room: any, date: Date) {
    const rate = room.peakSeasonRates.find(
      (r: any) => date >= r.startDate && date <= r.endDate,
    );
    const base = Number(room.basePrice);
    if (!rate) return base;
    return rate.priceType === "NOMINAL"
      ? Number(rate.value)
      : base + (base * Number(rate.value)) / 100;
  }

  private async verifyRoomAvailable(roomId: string, start: Date, end: Date) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { peakSeasonRates: true },
    });
    if (!room) throw new ApiError("Room not found", 404);

    const unavailable = await this.prisma.roomAvailability.findFirst({
      where: { roomId, date: { gte: start, lt: end }, isAvailable: false },
    });
    if (unavailable) throw new ApiError("Room not available", 400);
    return room;
  }

  async getPeakRates(roomId: string) {
    return this.prisma.peakSeasonRate.findMany({
      where: { roomId },
      orderBy: { startDate: "asc" },
    });
  }

  async getAvailability(roomId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return this.prisma.roomAvailability.findMany({
      where: { roomId, date: { gte: start, lte: end } },
    });
  }
}
