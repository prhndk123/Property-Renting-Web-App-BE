import { prisma } from "../src/lib/prisma.js";

async function check() {
  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        property: {
          select: {
            name: true,
            tenantId: true,
          },
        },
        payment: {
          select: {
            paymentStatus: true,
            paymentProof: true,
          },
        },
      },
    });

    console.log("--- RESERVATIONS STATUS CHECK ---");
    reservations.forEach((r) => {
      console.log(`ID: ${r.id}`);
      console.log(`Status: ${r.status}`);
      console.log(`TenantId: ${r.property.tenantId}`);
      console.log(`PaymentStatus: ${r.payment?.paymentStatus}`);
      console.log(`Has Proof: ${!!r.payment?.paymentProof}`);
      console.log("---------------------------");
    });
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

check();
