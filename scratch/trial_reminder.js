import { prisma } from "../src/lib/prisma.js";
import { MailService } from "../src/modules/mail/mail.service.js";

async function trialReminder() {
  console.log("🚀 Starting H-1 Reminder Trial (Enhanced)...");

  const targetDate = new Date("2026-04-24");
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(targetDate);
  end.setHours(23, 59, 59, 999);

  console.log(`🔍 Searching for CONFIRMED check-ins on April 24...`);

  const reservations = await prisma.reservation.findMany({
    where: {
      status: "CONFIRMED",
      checkinDate: { gte: start, lte: end },
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

  if (reservations.length === 0) {
    console.log("❌ No matching reservations found.");
    return;
  }

  console.log(
    `✅ Found ${reservations.length} reservation(s). Sending emails...`,
  );

  const mailService = new MailService();

  for (const res of reservations) {
    try {
      const nights = Math.ceil(
        (res.checkoutDate.getTime() - res.checkinDate.getTime()) /
          (1000 * 3600 * 24),
      );

      const rooms = res.reservationRooms.map((rr) => ({
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

      console.log(`📧 Sending to ${res.user.name} (${res.user.email})...`);
      console.log(`   Property: ${res.property.name}`);
      console.log(`   Rooms: ${rooms.map((r) => r.name).join(", ")}`);
      console.log(`   Nights: ${nights}`);
      console.log(
        `   Total: Rp ${Number(res.totalPrice).toLocaleString("id-ID")}`,
      );

      await mailService.sendEmail(
        res.user.email,
        "Reminder: Check-in Tomorrow! 🏨 (Trial Mode)",
        "checkin-reminder",
        {
          name: res.user.name,
          propertyName: res.property.name,
          propertyAddress: res.property.address,
          propertyCity: res.property.city || "",
          checkinDate: formatDate(res.checkinDate),
          checkoutDate: formatDate(res.checkoutDate),
          nights,
          rooms,
          totalPrice: Number(res.totalPrice).toLocaleString("id-ID"),
          reservationId: res.id.slice(0, 8).toUpperCase(),
        },
      );
      console.log(`✨ Email sent successfully!`);
    } catch (error) {
      console.error(`🔴 Failed:`, error);
    }
  }

  console.log("🏁 Trial completed.");
}

trialReminder()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
