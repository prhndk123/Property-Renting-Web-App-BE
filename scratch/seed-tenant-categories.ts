import { prisma } from "../src/lib/prisma.js";

async function seedForTenant() {
  try {
    const tenantId = "3679150d-7f66-4609-9514-27c122c34007"; // from your logs

    // Check if tenant exists
    const tenant = await prisma.user.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      console.log("Tenant not found in DB with id:", tenantId);
    } else {
      console.log("Found tenant:", tenant.name, "Role:", tenant.role);
    }

    const categories = ["Hotel", "Villa", "Apartment", "Resort", "Guesthouse"];

    let count = 0;
    for (const catName of categories) {
      await prisma.propertyCategory.upsert({
        where: {
          name_tenantId: {
            name: catName,
            tenantId: tenantId,
          },
        },
        update: {},
        create: {
          name: catName,
          tenantId: tenantId,
        },
      });
      count++;
    }

    console.log(
      `Successfully seeded ${count} categories for tenant: ${tenantId}`,
    );

    // verify
    const cats = await prisma.propertyCategory.findMany({
      where: { tenantId },
    });
    console.log(
      "Current categories:",
      cats.map((c) => c.name),
    );
  } catch (error) {
    console.error("Error seeding categories:", error);
  } finally {
    process.exit(0);
  }
}

seedForTenant();
