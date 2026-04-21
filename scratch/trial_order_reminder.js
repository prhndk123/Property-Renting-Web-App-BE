import { prisma } from "../src/lib/prisma.js";
import { MailService } from "../src/modules/mail/mail.service.js";

async function trialOrderReminder() {
  console.log("🚀 Starting Order Reminder (Payment Confirmed) Trial...");

  // Find a CONFIRMED reservation for April 24
  const reservation = await prisma.reservation.findFirst({
    where: {
      status: "CONFIRMED",
      checkinDate: {
        gte: new Date("2026-04-24T00:00:00Z"),
        lte: new Date("2026-04-24T23:59:59Z"),
      },
    },
    include: {
      user: { select: { name: true, email: true } },
      property: { select: { name: true, address: true, city: true } },
      reservationRooms: {
        include: {
          room: { select: { name: true } },
        },
      },
    },
  });

  if (!reservation) {
    console.log("❌ No CONFIRMED reservation found for April 24.");
    return;
  }

  console.log(`✅ Found reservation: ${reservation.id}`);
  console.log(`   User: ${reservation.user.name} (${reservation.user.email})`);
  console.log(`   Property: ${reservation.property.name}`);

  const nights = Math.ceil(
    (reservation.checkoutDate.getTime() - reservation.checkinDate.getTime()) /
      (1000 * 3600 * 24),
  );

  const rooms = reservation.reservationRooms.map((rr) => ({
    name: rr.room.name,
    nights: rr.nights,
    price: Number(rr.price).toLocaleString("id-ID"),
  }));

  const formatDate = (d) =>
    d.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  console.log(`   Rooms: ${rooms.map((r) => r.name).join(", ")}`);
  console.log(`   Nights: ${nights}`);
  console.log(
    `   Total: Rp ${Number(reservation.totalPrice).toLocaleString("id-ID")}`,
  );
  console.log(`\n📧 Sending Order Reminder email...`);

  const mailService = new MailService();

  try {
    await mailService.sendEmail(
      reservation.user.email,
      "Pembayaran Terkonfirmasi - Detail Pemesanan Anda ✅ (Trial)",
      "payment-receipt",
      {
        name: reservation.user.name,
        reservationId: reservation.id.slice(0, 8).toUpperCase(),
        propertyName: reservation.property.name,
        propertyAddress: reservation.property.address || "",
        propertyCity: reservation.property.city || "",
        checkinDate: formatDate(reservation.checkinDate),
        checkoutDate: formatDate(reservation.checkoutDate),
        nights,
        rooms,
        totalPrice: Number(reservation.totalPrice).toLocaleString("id-ID"),
      },
    );
    console.log(
      `✨ Order Reminder email sent successfully to ${reservation.user.email}!`,
    );
  } catch (error) {
    console.error(`🔴 Failed:`, error);
  }

  console.log("🏁 Trial completed.");
}

trialOrderReminder()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
