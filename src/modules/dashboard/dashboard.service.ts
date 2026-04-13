import { PrismaClient } from "../../../generated/prisma/client/index.js";

export class DashboardService {
  constructor(private prisma: PrismaClient) {}

  async getSummary(tenantId: string, start?: Date, end?: Date) {
    const range = this.getDateRange(start, end, 30);
    const [counts, stats, rev] = await Promise.all([
      this.getBasicCounts(tenantId),
      this.getReservationStats(tenantId, range),
      this.getRevenueTotal(tenantId, range),
    ]);
    return { ...counts, ...stats, totalRevenue: rev };
  }

  private getDateRange(start?: Date, end?: Date, daysBack: number = 30) {
    const e = end ?? new Date();
    const s = start ?? new Date(e.getTime() - daysBack * 24 * 3600 * 1000);
    s.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);
    return { gte: s, lte: e };
  }

  private async getBasicCounts(tenantId: string) {
    const [properties, rooms] = await Promise.all([
      this.prisma.property.count({ where: { tenantId } }),
      this.prisma.room.count({ where: { property: { tenantId } } }),
    ]);
    return { totalProperties: properties, totalRooms: rooms };
  }

  private async getReservationStats(tenantId: string, range: any) {
    const common = { property: { tenantId }, createdAt: range };
    const [total, pending, confirmed] = await Promise.all([
      this.prisma.reservation.count({ where: common }),
      this.prisma.reservation.count({
        where: { ...common, status: "WAITING_PAYMENT" },
      }),
      this.prisma.reservation.count({
        where: { ...common, status: "CONFIRMED" },
      }),
    ]);
    return {
      totalReservations: total,
      pendingPayments: pending,
      confirmedReservations: confirmed,
    };
  }

  private async getRevenueTotal(tenantId: string, range: any) {
    const agg = await this.prisma.reservation.aggregate({
      where: {
        property: { tenantId },
        status: { in: ["CONFIRMED", "COMPLETED"] },
        createdAt: range,
      },
      _sum: { totalPrice: true },
    });
    return Number(agg._sum.totalPrice ?? 0);
  }

  async getAnalytics(tenantId: string, start?: Date, end?: Date) {
    const range = this.getDateRange(start, end, 180); // 6 months
    return {
      monthlyRevenue: await this.getMonthlyRevenue(tenantId, range),
      occupancyRate: await this.getOccupancyRate(tenantId, range),
    };
  }

  private async getMonthlyRevenue(tenantId: string, range: any) {
    const res = await this.prisma.reservation.findMany({
      where: {
        property: { tenantId },
        status: { in: ["CONFIRMED", "COMPLETED"] },
        createdAt: range,
      },
      select: { totalPrice: true, createdAt: true },
    });
    return this.formatMonthlyRevenue(res, range);
  }

  private formatMonthlyRevenue(reservations: any[], range: any) {
    const map: Record<string, number> = {};
    let curr = new Date(range.gte);
    while (curr <= range.lte) {
      map[`${curr.getFullYear()}-${curr.getMonth()}`] = 0;
      curr.setMonth(curr.getMonth() + 1);
    }
    reservations.forEach((r) => {
      const k = `${r.createdAt.getFullYear()}-${r.createdAt.getMonth()}`;
      if (map[k] !== undefined) map[k] += Number(r.totalPrice);
    });
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return Object.entries(map).map(([k, v]) => ({
      name: months[parseInt(k.split("-")[1])],
      revenue: v,
    }));
  }

  private async getOccupancyRate(tenantId: string, range: any) {
    const rooms = await this.prisma.room.count({
      where: { property: { tenantId } },
    });
    const nights = Math.ceil(
      (range.lte.getTime() - range.gte.getTime()) / (1000 * 3600 * 24),
    );
    const totalPotential = rooms * nights;
    if (totalPotential === 0) return 0;

    const booked = await this.prisma.reservationRoom.aggregate({
      where: {
        room: { property: { tenantId } },
        reservation: {
          status: { in: ["CONFIRMED", "COMPLETED"] },
          checkinDate: { gte: range.gte },
          checkoutDate: { lte: range.lte },
        },
      },
      _sum: { nights: true },
    });
    return (
      Math.round(((booked._sum.nights ?? 0) / totalPotential) * 10000) / 100
    );
  }

  async getSalesReport(tenantId: string, start?: Date, end?: Date) {
    const range = this.getDateRange(start, end, 30);
    const where = {
      property: { tenantId },
      status: { in: ["CONFIRMED", "COMPLETED"] as any },
      createdAt: range,
    };

    const [byProperty, byUser, transactions] = await Promise.all([
      this.prisma.reservation.groupBy({
        by: ["propertyId"],
        where,
        _sum: { totalPrice: true },
        _count: { id: true },
      }),
      this.prisma.reservation.groupBy({
        by: ["userId"],
        where,
        _sum: { totalPrice: true },
        _count: { id: true },
      }),
      this.prisma.reservation.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          property: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Enhance property info
    const propertyIds = byProperty.map((p) => p.propertyId);
    const propertyNames = await this.prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: { id: true, name: true },
    });

    // Enhance user info
    const userIds = byUser.map((u) => u.userId);
    const userNames = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    return {
      byProperty: byProperty.map((p) => ({
        ...p,
        name:
          propertyNames.find((pn) => pn.id === p.propertyId)?.name || "Unknown",
      })),
      byUser: byUser.map((u) => ({
        ...u,
        name: userNames.find((un) => un.id === u.userId)?.name || "Unknown",
        email: userNames.find((un) => un.id === u.userId)?.email || "",
      })),
      transactions,
    };
  }

  async getPropertyCalendar(tenantId: string, month: number, year: number) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const rooms = await this.prisma.room.findMany({
      where: { property: { tenantId } },
      select: {
        id: true,
        name: true,
        propertyId: true,
        property: { select: { name: true } },
      },
    });

    const reservations = await this.prisma.reservationRoom.findMany({
      where: {
        room: { property: { tenantId } },
        reservation: {
          status: { in: ["CONFIRMED", "COMPLETED"] as any },
          OR: [
            { checkinDate: { gte: start, lte: end } },
            { checkoutDate: { gte: start, lte: end } },
          ],
        },
      },
      include: {
        reservation: {
          select: {
            id: true,
            checkinDate: true,
            checkoutDate: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    return { rooms, reservations };
  }
}
