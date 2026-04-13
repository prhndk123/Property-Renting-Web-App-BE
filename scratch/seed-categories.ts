import { PrismaClient } from "../generated/prisma/client/index.js";

async function seed() {
  const prisma = new PrismaClient();
  try {
    const tenants = await prisma.user.findMany({
      where: { role: "TENANT" },
    });

    if (tenants.length === 0) {
      console.log("No tenants found. Please register as a tenant first.");
      return;
    }

    const categories = ["Hotel", "Villa", "Apartment", "Resort", "Guesthouse"];

    for (const tenant of tenants) {
      console.log(
        `Seeding categories for tenant: ${tenant.name} (${tenant.email})...`,
      );

      for (const catName of categories) {
        await prisma.propertyCategory.upsert({
          where: {
            name_tenantId: {
              name: catName,
              tenantId: tenant.id,
            },
          },
          update: {},
          create: {
            name: catName,
            tenantId: tenant.id,
          },
        });
      }
    }

    console.log("Successfully seeded categories for all tenants.");
  } catch (error) {
    console.error("Error seeding categories:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
