import {
  PrismaClient,
  Prisma,
} from "../../../generated/prisma/client/index.js";
import { ApiError } from "../../utils/api-error.js";
import { AvailabilityService } from "../availability/availability.service.js";
import {
  CreateReservationDto,
  GetReservationsQueryDto,
} from "./dto/reservation.dto.js";
import { XenditService } from "../payment/xendit.service.js";
import { MailService } from "../mail/mail.service.js";

export class ReservationService {
  constructor(
    private prisma: PrismaClient,
    private availability: AvailabilityService,
    private xenditService: XenditService,
    private mailService: MailService,
  ) {}

  // ─── CREATE RESERVATION ─────────────────────────────────────────────

  async createReservation(userId: string, data: CreateReservationDto) {
    const { propertyId, roomId, checkinDate, checkoutDate } = data;
    const paymentMethod = data.paymentMethod || "MANUAL_TRANSFER";
    const info = await this.availability.calculateTotalPrice(
      roomId,
      new Date(checkinDate),
      new Date(checkoutDate),
    );
    return this.prisma.$transaction(async (tx: any) => {
      const res = await this.createResRecord(
        tx,
        userId,
        propertyId,
        checkinDate,
        checkoutDate,
        info,
      );
      await this.createResRoom(tx, res.id, roomId, info);
      const invoiceUrl = await this.handleGateway(
        tx,
        paymentMethod,
        userId,
        res.id,
        info,
      );
      await this.createResPayment(tx, res.id, paymentMethod, invoiceUrl);

      // Block dates immediately on WAITING_PAYMENT
      await this.toggleDatesAvailability(
        tx,
        { ...res, reservationRooms: [{ roomId }] },
        false,
      );

      return { ...res, invoiceUrl };
    });
  }

  private async createResRecord(
    tx: any,
    userId: string,
    propertyId: string,
    checkin: string,
    checkout: string,
    info: any,
  ) {
    return tx.reservation.create({
      data: {
        userId,
        propertyId,
        checkinDate: new Date(checkin),
        checkoutDate: new Date(checkout),
        totalPrice: info.totalPrice,
        status: "WAITING_PAYMENT",
      },
    });
  }

  private async createResRoom(
    tx: any,
    reservationId: string,
    roomId: string,
    info: any,
  ) {
    return tx.reservationRoom.create({
      data: {
        reservationId,
        roomId,
        price: info.totalPrice,
        nights: info.nights,
      },
    });
  }

  private async createResPayment(
    tx: any,
    reservationId: string,
    paymentMethod: string,
    invoiceUrl?: string | null,
  ) {
    return tx.payment.create({
      data: {
        reservationId,
        paymentMethod,
        paymentStatus: "PENDING",
        invoiceUrl: invoiceUrl || null,
      },
    });
  }

  private async handleGateway(
    tx: any,
    method: string,
    userId: string,
    resId: string,
    info: any,
  ) {
    if (method !== "PAYMENT_GATEWAY") return null;
    const user = await tx.user.findUnique({ where: { id: userId } });
    const invoice = await this.xenditService.createInvoice({
      externalId: resId,
      amount: Number(info.totalPrice),
      payerEmail: user?.email || "guest@example.com",
      description: `Payment for Reservation ${resId}`,
    });
    return (invoice as any).invoiceUrl || (invoice as any).invoice_url;
  }

  // ─── GET RESERVATIONS (with date/order filters) ─────────────────────

  async getReservations(
    userId: string,
    role: string | null,
    query: GetReservationsQueryDto,
  ) {
    console.log(
      "[ReservationService] getReservations for userId:",
      userId,
      "with role:",
      role,
    );
    const { page, take, sortBy, sortOrder } = query;
    const where = this.buildReservationWhere(userId, role, query);

    console.log(
      "[ReservationService] Filter where clause:",
      JSON.stringify(where, null, 2),
    );

    const [data, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        take,
        skip: (page - 1) * take,
        orderBy: { [sortBy]: sortOrder },
        include: this.reservationInclude(),
      }),
      this.prisma.reservation.count({ where }),
    ]);
    return { data, meta: { page, take, total } };
  }

  private buildReservationWhere(
    userId: string,
    role: string | null,
    query: GetReservationsQueryDto,
  ): Prisma.ReservationWhereInput {
    const { status, startDate, endDate, orderId } = query;

    // Defensive check for role casing
    const isTenant = role?.toString().toUpperCase() === "TENANT";

    const base = isTenant ? { property: { tenantId: userId } } : { userId };

    console.log(
      "[ReservationService] isTenant check:",
      isTenant,
      "(Actual role:",
      role,
      ")",
    );
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    return {
      ...base,
      ...(status && { status }),
      ...(orderId && { id: orderId }),
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    };
  }

  private reservationInclude() {
    return {
      user: { select: { name: true, email: true } },
      property: {
        include: {
          images: true,
        },
      },
      reservationRooms: { include: { room: true } },
      payment: true,
    };
  }

  // ─── GET SINGLE RESERVATION ─────────────────────────────────────────

  async getReservationById(resId: string, userId: string, role: string | null) {
    const res = await this.prisma.reservation.findUnique({
      where: { id: resId },
      include: this.reservationInclude(),
    });
    if (!res) throw new ApiError("Reservation not found", 404);

    // Scope check: user can only see own reservations, tenant sees their properties
    if (role === "TENANT") {
      if (res.property.tenantId !== userId)
        throw new ApiError("Forbidden", 403);
    } else {
      if (res.userId !== userId) throw new ApiError("Not found", 404);
    }

    return res;
  }

  // ─── UPLOAD PAYMENT PROOF ───────────────────────────────────────────

  async uploadPaymentProof(resId: string, userId: string, proof: string) {
    const res = await this.findUserReservation(resId, userId);
    if (res.status !== "WAITING_PAYMENT") {
      throw new ApiError(
        "Can only upload proof when status is WAITING_PAYMENT",
        400,
      );
    }
    return this.prisma.$transaction([
      this.prisma.payment.update({
        where: { reservationId: resId },
        data: { paymentProof: proof, paymentStatus: "PENDING" },
      }),
      this.prisma.reservation.update({
        where: { id: resId },
        data: { status: "WAITING_CONFIRMATION" },
      }),
    ]);
  }

  // ─── CONFIRM / REJECT PAYMENT ──────────────────────────────────────

  async confirmPayment(resId: string, tenantId: string, confirm: boolean) {
    const res = await this.findTenantReservation(resId, tenantId);
    if (!confirm) return this.rejectPayment(resId);
    return this.approvePayment(resId, res);
  }

  private async approvePayment(resId: string, res: any) {
    return this.prisma.$transaction(async (tx: any) => {
      await tx.payment.update({
        where: { reservationId: resId },
        data: { paymentStatus: "CONFIRMED", paidAt: new Date() },
      });
      const updated = await tx.reservation.update({
        where: { id: resId },
        data: { status: "CONFIRMED" },
      });
      // Already blocked on creation, so no need to block again,
      // but toggleDatesAvailability is idempotent (using upsert), so it's safe.
      await this.toggleDatesAvailability(tx, res, false);
      await this.sendConfirmationEmail(res);
      return updated;
    });
  }

  private async rejectPayment(resId: string) {
    return this.prisma.$transaction([
      this.prisma.payment.update({
        where: { reservationId: resId },
        data: { paymentStatus: "REJECTED", paymentProof: null },
      }),
      this.prisma.reservation.update({
        where: { id: resId },
        data: { status: "WAITING_PAYMENT" },
      }),
    ]);
  }

  // ─── CANCEL ORDER (User) ───────────────────────────────────────────

  async cancelReservation(resId: string, userId: string) {
    const res = await this.findUserReservation(resId, userId);
    if (res.status !== "WAITING_PAYMENT") {
      throw new ApiError(
        "Can only cancel before payment proof is uploaded",
        400,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: resId },
        data: { status: "CANCELLED" },
      });
      // Release dates
      await this.toggleDatesAvailability(tx, res, true);
      return { message: "Reservation cancelled successfully" };
    });
  }

  // ─── CANCEL ORDER (Tenant) ─────────────────────────────────────────

  async cancelReservationByTenant(resId: string, tenantId: string) {
    const res = await this.findTenantReservation(resId, tenantId);
    if (res.status !== "WAITING_PAYMENT") {
      throw new ApiError(
        "Can only cancel when payment proof has not been uploaded",
        400,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: resId },
        data: { status: "CANCELLED" },
      });
      // Release dates
      await this.toggleDatesAvailability(tx, res, true);
      return { message: "Reservation cancelled by tenant" };
    });
  }

  // ─── XENDIT WEBHOOK ────────────────────────────────────────────────

  async handleXenditWebhook(payload: any) {
    const { external_id, status } = payload;
    if (!external_id || status !== "PAID") return { message: "Ignored" };

    // Xendit sends test webhooks with dummy IDs. Prisma will crash (500) if we pass non-UUIDs.
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(external_id)) {
      console.log(
        "Xendit Webhook: Ignored non-UUID external_id (likely a test webhook)",
      );
      return { message: "Ignored non-UUID" };
    }

    const res = await this.prisma.reservation.findUnique({
      where: { id: external_id },
      include: this.reservationInclude(),
    });
    if (!res) return { message: "Reservation not found" };
    if (res.status === "CONFIRMED") return { message: "Already confirmed" };

    return this.prisma.$transaction(async (tx: any) => {
      await tx.payment.update({
        where: { reservationId: external_id },
        data: { paymentStatus: "CONFIRMED", paidAt: new Date() },
      });
      const updated = await tx.reservation.update({
        where: { id: external_id },
        data: { status: "CONFIRMED" },
      });
      await this.toggleDatesAvailability(tx, res, false);
      await this.sendConfirmationEmail(res);
      return updated;
    });
  }

  // ─── HELPERS ───────────────────────────────────────────────────────

  private async findUserReservation(resId: string, userId: string) {
    const res = await this.prisma.reservation.findUnique({
      where: { id: resId },
      include: { reservationRooms: true },
    });
    if (!res || res.userId !== userId) throw new ApiError("Not found", 404);
    return res;
  }

  private async findTenantReservation(resId: string, tenantId: string) {
    const res = await this.prisma.reservation.findUnique({
      where: { id: resId },
      include: this.reservationInclude(),
    });
    if (!res || res.property.tenantId !== tenantId)
      throw new ApiError("Forbidden", 403);
    return res;
  }

  private async toggleDatesAvailability(
    tx: any,
    res: any,
    isAvailable: boolean,
  ) {
    const nights = this.calcNights(res.checkinDate, res.checkoutDate);

    // Ensure reservationRooms are populated for existing records
    const rooms = res.reservationRooms || [];

    for (const rr of rooms) {
      for (let i = 0; i < nights; i++) {
        const date = new Date(res.checkinDate);
        date.setDate(date.getDate() + i);
        await tx.roomAvailability.upsert({
          where: { roomId_date: { roomId: rr.roomId, date } },
          update: { isAvailable },
          create: { roomId: rr.roomId, date, isAvailable },
        });
      }
    }
  }

  private async markDatesUnavailable(tx: any, res: any) {
    return this.toggleDatesAvailability(tx, res, false);
  }

  private calcNights(checkin: Date, checkout: Date) {
    return Math.ceil(
      (checkout.getTime() - checkin.getTime()) / (1000 * 3600 * 24),
    );
  }

  private async sendConfirmationEmail(res: any) {
    const user = res.user;
    if (!user) return;
    this.mailService
      .sendEmail(user.email, "Payment Confirmed ✅", "payment-receipt", {
        name: user.name,
        reservationId: res.id,
        propertyName: res.property?.name || "Property",
        checkinDate: res.checkinDate.toLocaleDateString(),
        checkoutDate: res.checkoutDate.toLocaleDateString(),
        totalPrice: Number(res.totalPrice).toLocaleString("id-ID"),
      })
      .catch((e) => console.error("Confirmation email failed", e));
  }
}
