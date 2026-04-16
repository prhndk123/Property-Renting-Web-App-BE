import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client/index.js";

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString: connectionString! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const reservations = await prisma.reservation.findMany({
    select: {
      id: true,
      status: true,
      totalPrice: true,
      payment: {
        select: {
          paymentMethod: true,
          paymentStatus: true,
          invoiceUrl: true,
        },
      },
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
  console.log("Recent reservations:");
  console.log(JSON.stringify(reservations, null, 2));
}

main().catch(console.error);
