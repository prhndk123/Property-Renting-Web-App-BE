import * as dotenv from "dotenv";
import { PrismaClient } from "../generated/prisma/client/index.js";

dotenv.config();

// Prisma automatically looks for DATABASE_URL in process.env
// if it's defined in your schema.prisma.
const prisma = new PrismaClient();

async function addDefaultCategories() {
  const tenantId = "3679150d-7f66-4609-9514-27c122c34007"; // Zaenal Arifin

  const categories = ["Villa", "Apartment", "Hotel", "Guest House", "Cabin"];

  try {
    console.log(`Adding default categories for tenant ${tenantId}...`);

    for (const name of categories) {
      await prisma.propertyCategory.upsert({
        where: {
          name_tenantId: {
            name,
            tenantId,
          },
        },
        update: {},
        create: {
          name,
          tenantId,
        },
      });
      console.log(`- Added/Verified: ${name}`);
    }

    console.log("Done!");
  } catch (error) {
    console.error("Error adding categories:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addDefaultCategories();
