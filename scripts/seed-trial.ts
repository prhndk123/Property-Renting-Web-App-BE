import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/argon.js";

async function seed() {
  console.log("🚀 Starting Trial Seeder...");

  try {
    // 1. Create a Tenant
    const tenantPassword = await hashPassword("password123");
    const tenant = await prisma.user.upsert({
      where: { email: "tenant@trial.com" },
      update: {},
      create: {
        email: "tenant@trial.com",
        name: "Trial Tenant",
        password: tenantPassword,
        role: "TENANT",
        isVerified: true,
      },
    });
    console.log("✅ Tenant Account: tenant@trial.com / password123");

    // 2. Create a Category
    const category = await prisma.propertyCategory.upsert({
      where: {
        name_tenantId: {
          name: "Villa",
          tenantId: tenant.id,
        },
      },
      update: {},
      create: {
        name: "Villa",
        tenantId: tenant.id,
      },
    });
    console.log("✅ Category: Villa");

    // 3. Create a Property
    const property = await prisma.property.create({
      data: {
        name: "Grand Opening Villa",
        slug: "grand-opening-villa-" + Math.floor(Math.random() * 1000),
        description: "A beautiful villa for trial transactions.",
        address: "Jl. Trial No. 101",
        city: "Jakarta",
        tenantId: tenant.id,
        categoryId: category.id,
        images: {
          create: [
            {
              imageUrl:
                "https://images.unsplash.com/photo-1580587771525-78b9dba3b914",
            },
          ],
        },
      },
    });
    console.log("✅ Property: " + property.name);

    // 4. Create a Room
    const room = await prisma.room.create({
      data: {
        name: "Standard Suite",
        description: "Comfortable standard suite.",
        capacity: 2,
        basePrice: 500000,
        propertyId: property.id,
        images: {
          create: [
            {
              imageUrl:
                "https://images.unsplash.com/photo-1566073771259-6a8506099945",
            },
          ],
        },
      },
    });
    console.log("✅ Room: " + room.name);

    // 5. Create Availability for today and tomorrow
    const dates = [new Date()];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dates.push(tomorrow);

    await prisma.roomAvailability.createMany({
      data: dates.map((d) => ({
        roomId: room.id,
        date: d,
        isAvailable: true,
      })),
      skipDuplicates: true,
    });
    console.log("✅ Availability set for today and tomorrow.");

    // 6. Create a Customer
    const userPassword = await hashPassword("password123");
    await prisma.user.upsert({
      where: { email: "user@trial.com" },
      update: {},
      create: {
        email: "user@trial.com",
        name: "Trial User",
        password: userPassword,
        role: "USER",
        isVerified: true,
      },
    });
    console.log("✅ Customer Account: user@trial.com / password123");

    console.log(
      "\n✨ Done! You can now login as 'user@trial.com' and book 'Grand Opening Villa'.",
    );
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
