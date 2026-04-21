import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client/index.js";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const reservations = await prisma.reservation.findMany({
    where: {
      checkinDate: {
        gte: new Date("2026-04-24T00:00:00Z"),
        lte: new Date("2026-04-24T23:59:59Z"),
      },
    },
    include: {
      user: { select: { name: true, email: true } },
      property: { select: { name: true } },
    },
  });

  console.log("Found reservations for April 24:");
  console.log(JSON.stringify(reservations, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
