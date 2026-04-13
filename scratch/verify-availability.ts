import * as dotenv from "dotenv";
import { PrismaClient } from "../generated/prisma/client/index.js";

dotenv.config();

const prisma = new PrismaClient();

async function verifyAvailability() {
  const roomId = "3f0d2c6c-8e8a-4d7a-8f6a-9b1c7a8b9c0d"; // Example Room ID
  const checkin = new Date("2026-05-01");
  const checkout = new Date("2026-05-03");

  try {
    console.log(
      `Checking availability for Room ${roomId} from ${checkin.toISOString()} to ${checkout.toISOString()}...`,
    );

    const availability = await prisma.roomAvailability.findMany({
      where: {
        roomId,
        date: {
          gte: checkin,
          lt: checkout,
        },
      },
    });

    console.log("Current Availability Records:");
    console.table(
      availability.map((a) => ({
        date: a.date.toISOString().split("T")[0],
        isAvailable: a.isAvailable,
      })),
    );
  } catch (error) {
    console.error("Error during verification:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAvailability();
