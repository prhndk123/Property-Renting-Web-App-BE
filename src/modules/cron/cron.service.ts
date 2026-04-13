import cron from "node-cron";
import { PrismaClient } from "../../../generated/prisma/client/index.js";
import { MailService } from "../mail/mail.service.js";

export class CronService {
  constructor(
    private prisma: PrismaClient,
    private mailService: MailService,
  ) {}

  start() {
    this.scheduleAutoCancelUnpaid();
    this.scheduleCheckinReminder();
  }

  // ─── Auto-cancel unpaid reservations after 1 hour ─────────────────

  private scheduleAutoCancelUnpaid() {
    cron.schedule("*/15 * * * *", async () => {
      try {
        await this.autoCancelExpired();
      } catch (e) {
        console.error("Auto-cancel cron error:", e);
      }
    });
  }

  private async autoCancelExpired() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const expired = await this.findExpiredReservations(oneHourAgo);
    for (const res of expired) {
      await this.cancelExpiredReservation(res);
    }
    if (expired.length > 0) {
      console.log(`Auto-cancelled ${expired.length} expired reservations`);
    }
  }

  private async findExpiredReservations(before: Date) {
    return this.prisma.reservation.findMany({
      where: {
        status: "WAITING_PAYMENT",
        createdAt: { lt: before },
        payment: { paymentMethod: "MANUAL_TRANSFER" },
      },
      include: {
        reservationRooms: true,
      },
    });
  }

  private async cancelExpiredReservation(res: any) {
    const resId = res.id;
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { reservationId: resId },
        data: { paymentStatus: "REJECTED" },
      });
      await tx.reservation.update({
        where: { id: resId },
        data: { status: "CANCELLED" },
      });

      // Release rooms
      const nights = Math.ceil(
        (res.checkoutDate.getTime() - res.checkinDate.getTime()) /
          (1000 * 3600 * 24),
      );
      for (const rr of res.reservationRooms) {
        for (let i = 0; i < nights; i++) {
          const date = new Date(res.checkinDate);
          date.setDate(date.getDate() + i);
          await tx.roomAvailability.upsert({
            where: { roomId_date: { roomId: rr.roomId, date } },
            update: { isAvailable: true },
            create: { roomId: rr.roomId, date, isAvailable: true },
          });
        }
      }
    });
  }

  // ─── H-1 Check-in Reminder ────────────────────────────────────────

  private scheduleCheckinReminder() {
    cron.schedule("0 8 * * *", async () => {
      try {
        await this.sendCheckinReminders();
      } catch (e) {
        console.error("Checkin reminder cron error:", e);
      }
    });
  }

  private async sendCheckinReminders() {
    const tomorrow = this.getTomorrowRange();
    const reservations = await this.findTomorrowCheckins(tomorrow);
    for (const res of reservations) {
      await this.sendReminderEmail(res);
    }
    if (reservations.length > 0) {
      console.log(`Sent ${reservations.length} check-in reminders`);
    }
  }

  private getTomorrowRange() {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private async findTomorrowCheckins(range: { start: Date; end: Date }) {
    return this.prisma.reservation.findMany({
      where: {
        status: "CONFIRMED",
        checkinDate: { gte: range.start, lte: range.end },
      },
      include: {
        user: { select: { name: true, email: true } },
        property: { select: { name: true, address: true } },
      },
    });
  }

  private async sendReminderEmail(res: any) {
    if (!res.user?.email) return;
    this.mailService
      .sendEmail(
        res.user.email,
        "Reminder: Check-in Tomorrow! 🏨",
        "checkin-reminder",
        {
          name: res.user.name,
          propertyName: res.property.name,
          propertyAddress: res.property.address,
          checkinDate: res.checkinDate.toLocaleDateString(),
        },
      )
      .catch((e) => console.error("Reminder email failed:", e));
  }
}
