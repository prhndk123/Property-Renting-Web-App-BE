import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/argon.js";

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Create Tenant
  const tenantPassword = await hashPassword("password123");
  const tenant = await prisma.user.upsert({
    where: { email: "tenant@example.com" },
    update: {},
    create: {
      email: "tenant@example.com",
      name: "John Tenant",
      password: tenantPassword,
      role: "TENANT",
      isVerified: true,
    },
  });
  console.log("✅ Tenant ready:", tenant.email);

  // 2. Create Customer User
  const userPassword = await hashPassword("password123");
  const customer = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      email: "user@example.com",
      name: "Jane Customer",
      password: userPassword,
      role: "USER",
      isVerified: true,
    },
  });
  console.log("✅ Customer ready:", customer.email);

  // 3. Create Category
  const category = await prisma.propertyCategory.upsert({
    where: { name: "Villa" },
    update: {},
    create: {
      name: "Villa",
    },
  });
  console.log("✅ Category ready:", category.name);

  // 4. Create Property
  // We use create instead of upsert for property to avoid complex logic with slug
  const existingProperty = await prisma.property.findFirst({
    where: { name: "Beautiful Beachfront Villa" },
  });

  let property;
  if (!existingProperty) {
    property = await prisma.property.create({
      data: {
        name: "Beautiful Beachfront Villa",
        slug: "beautiful-beachfront-villa-" + Math.floor(Math.random() * 1000),
        description: "A luxury villa right by the ocean.",
        address: "Jl. Beach No. 1",
        city: "Bali",
        tenantId: tenant.id,
        categoryId: category.id,
        images: {
          create: [
            {
              imageUrl:
                "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
            },
          ],
        },
      },
    });
    console.log("✅ Property created:", property.name);
  } else {
    property = existingProperty;
    console.log("✅ Property already exists:", property.name);
  }

  // 5. Create Room
  const existingRoom = await prisma.room.findFirst({
    where: { propertyId: property.id, name: "Deluxe Ocean Suite" },
  });

  let room;
  if (!existingRoom) {
    room = await prisma.room.create({
      data: {
        name: "Deluxe Ocean Suite",
        description: "Spacious room with king bed and balcony.",
        capacity: 2,
        basePrice: 1500000,
        propertyId: property.id,
        images: {
          create: [
            {
              imageUrl:
                "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
            },
          ],
        },
      },
    });
    console.log("✅ Room created:", room.name);
  } else {
    room = existingRoom;
    console.log("✅ Room already exists:", room.name);
  }

  // 6. Create Availability for the next 30 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const availabilityData = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    availabilityData.push({
      roomId: room.id,
      date: date,
      isAvailable: true,
    });
  }

  await prisma.roomAvailability.createMany({
    data: availabilityData,
    skipDuplicates: true,
  });
  console.log("✅ Availability ready for 30 days");

  console.log("✨ Seeding complete!");
  console.log("\n--- LOGIN DETAILS ---");
  console.log("Tenant Account:  tenant@example.com / password123");
  console.log("Customer Account: user@example.com / password123");
  console.log("----------------------");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
