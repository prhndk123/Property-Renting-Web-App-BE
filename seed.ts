import { prisma } from "./src/lib/prisma.js";

async function main() {
  console.log("Memulai proses seeding untuk 5 properti...");

  // 1. Cari Tenant berdasarkan Email
  const tenantEmail = "garos39765@parsitv.com";
  const tenant = await prisma.user.findUnique({
    where: { email: tenantEmail },
  });

  if (!tenant) {
    throw new Error(
      `Tenant dengan email ${tenantEmail} tidak ditemukan. Harap login atau register terlebih dahulu.`,
    );
  }

  const tenantId = tenant.id;

  // Daftar UUID Kategori
  const CATEGORY = {
    HOTEL: "7e03ee1b-061a-483a-a88e-2b8b84a113eb",
    VILLA: "492a2dab-c6a2-4f67-868b-41277b394a75",
    RESORT: "dd68901e-95c4-44dd-9faf-bf2046fa224a",
    APARTMENT: "f6d52a58-7f92-473f-9b48-9cbcf8f95f65",
    GUESTHOUSE: "440a6d13-250d-4fa5-beb9-fa3f490cd43b",
  };

  // 2. Siapkan Data 5 Properti
  const propertiesData = [
    // --- 1. HOTEL ---
    {
      tenantId,
      categoryId: CATEGORY.HOTEL,
      name: "Grand Horizon Hotel",
      slug: `grand-horizon-hotel-${Date.now()}`,
      description:
        "Hotel bintang 5 di pusat kota yang menawarkan keseimbangan sempurna antara bisnis dan rekreasi. Dilengkapi dengan restoran fine-dining, kolam renang infinity, ruang meeting modern, dan layanan spa kelas dunia. Sangat strategis dekat dengan pusat perbelanjaan dan stasiun.",
      address: "Jl. MH Thamrin Kav 20, Jakarta Pusat",
      city: "Jakarta",
      latitude: -6.1931,
      longitude: 106.8228,
      images: [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1582719478250-c89404bb8a15?q=80&w=800&auto=format&fit=crop",
      ],
      rooms: [
        {
          name: "Deluxe City View",
          description:
            "Kamar modern seluas 35sqm dengan pemandangan lanskap kota Jakarta yang memukau. Fasilitas lengkap termasuk smart TV 50 inch, meja kerja, minibar, dan ranjang super king. Kamar mandi dalam dengan shower air panas.",
          capacity: 2,
          basePrice: 1500000,
          roomImages: [
            "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=800&auto=format&fit=crop",
          ],
        },
        {
          name: "Presidential Suite",
          description:
            "Kamar super mewah seluas 120sqm dilengkapi dengan ruang tamu, ruang makan privat, dan balkon pribadi. Pemandangan 180 derajat kota. Kamar mandi berlapis marmer dengan jacuzzi dan amenitas mewah.",
          capacity: 4,
          basePrice: 5500000,
          roomImages: [
            "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=800&auto=format&fit=crop",
          ],
        },
      ],
    },

    // --- 2. VILLA ---
    {
      tenantId,
      categoryId: CATEGORY.VILLA,
      name: "Ubud Serenity Villa",
      slug: `ubud-serenity-villa-${Date.now()}`,
      description:
        "Villa bernuansa tropis Bali yang tenang dan asri, dikelilingi oleh terasering sawah yang hijau. Sangat pas untuk madu, liburan, atau menjauh dari hiruk-pikuk kota. Memiliki private pool besar dan area yoga.",
      address: "Jl. Raya Campuhan, Ubud, Gianyar",
      city: "Bali",
      latitude: -8.5028,
      longitude: 115.253,
      images: [
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1510798831971-661eb04b3739?q=80&w=800&auto=format&fit=crop",
      ],
      rooms: [
        {
          name: "One Bedroom Private Pool",
          description:
            "Villa lengkap mandiri dengan satu kamar tidur. Menawarkan kolam renang pribadi langsung di depan kamar. Dapur terbuka, kamar mandi ala taman tropis dengan bathtub batu.",
          capacity: 2,
          basePrice: 2800000,
          roomImages: [
            "https://images.unsplash.com/photo-1528909514045-2f41c0953bf6?q=80&w=800&auto=format&fit=crop",
          ],
        },
        {
          name: "Two Bedroom Family Villa",
          description:
            "Cocok untuk liburan keluarga atau teman. Terdapat dua kamar tidur beda lantai, ruang tamu luas, dapur lengkap, serta kolam renang dan kursi gantung (swing) untuk bersantai.",
          capacity: 4,
          basePrice: 4200000,
          roomImages: [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800&auto=format&fit=crop",
          ],
        },
      ],
    },

    // --- 3. RESORT ---
    {
      tenantId,
      categoryId: CATEGORY.RESORT,
      name: "Oceanfront Paradise Resort",
      slug: `oceanfront-paradise-resort-${Date.now()}`,
      description:
        "Resort eksklusif tepi pantai dengan pasir putih yang privat. Fasilitas lengkap mulai dari kolam air asin, snorkeling spot langsung di pantai, restoran seafood segar, dan bar pinggir pantai yang fantastis untuk melihat sunset.",
      address: "Jl. Pantai Kuta, Kuta, Badung",
      city: "Bali",
      latitude: -8.7185,
      longitude: 115.1686,
      images: [
        "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=800&auto=format&fit=crop",
      ],
      rooms: [
        {
          name: "Ocean View Bungalow",
          description:
            "Kamar bernuansa bungalow kayu premium yang menghadap langsung ke lautan biru. Dilengkapi teras untuk bersantai sore hari sambil menikmati deburan ombak.",
          capacity: 2,
          basePrice: 3500000,
          roomImages: [
            "https://images.unsplash.com/photo-1587061949409-02df41d5e562?q=80&w=800&auto=format&fit=crop",
          ],
        },
        {
          name: "Lagoon Access Room",
          description:
            "Kamar modern dengan akses langsung menuju kolam renang sepanjang 150 meter dari balkon Anda. Sangat ideal untuk pecinta renang di pagi hari.",
          capacity: 2,
          basePrice: 2500000,
          roomImages: [
            "https://images.unsplash.com/photo-1584065798991-383dc4bbfc01?q=80&w=800&auto=format&fit=crop",
          ],
        },
      ],
    },

    // --- 4. APARTMENT ---
    {
      tenantId,
      categoryId: CATEGORY.APARTMENT,
      name: "Skyview Luxury Apartment",
      slug: `skyview-luxury-apartment-${Date.now()}`,
      description:
        "Apartemen mewah tinggi pencakar langit bergaya kontemporer. Fasilitas premium dari kolam renang rooftop, gym lengkap, dan smart home system. Dekat dengan area CBD untuk kemudahan mobilitas.",
      address: "Jl. Jendral Sudirman Kav 55",
      city: "Jakarta",
      latitude: -6.2231,
      longitude: 106.8118,
      images: [
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=800&auto=format&fit=crop",
      ],
      rooms: [
        {
          name: "Premium Studio Room",
          description:
            "Kamar studio modern yang efisien, untuk profesional muda. Ranjang king size, dapur kecil berbahan granit, smart TV, dan mesin cuci.",
          capacity: 2,
          basePrice: 850000,
          roomImages: [
            "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=800&auto=format&fit=crop",
          ],
        },
        {
          name: "Executive 2-Bedroom Suite",
          description:
            "Unit luas dengan living room, 2 kamar tidur terpisah (Master & Twin), cocok untuk keluarga pelancong atau pebisnis. City view dari living room sangat indah.",
          capacity: 4,
          basePrice: 1800000,
          roomImages: [
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop",
          ],
        },
      ],
    },

    // --- 5. GUESTHOUSE ---
    {
      tenantId,
      categoryId: CATEGORY.GUESTHOUSE,
      name: "Cozy Corner Guesthouse",
      slug: `cozy-corner-guesthouse-${Date.now()}`,
      description:
        "Penginapan yang menawarkan nuansa kehangatan seperti rumah sendiri. Lokasi tersembunyi jauh dari suara bising kendaraan, tapi dekat dengan pusat kuliner khas Yogyakarta.",
      address: "Jl. Prawirotaman No 33",
      city: "Yogyakarta",
      latitude: -7.8228,
      longitude: 110.3703,
      images: [
        "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1616486028123-d6bb1d6be330?q=80&w=800&auto=format&fit=crop",
      ],
      rooms: [
        {
          name: "Standard Double Room",
          description:
            "Kamar bersih dan nyaman dengan AC, ranjang double, WiFi cepat, dan kamar mandi bersih ala rumahan.",
          capacity: 2,
          basePrice: 350000,
          roomImages: [
            "https://images.unsplash.com/photo-1590490359854-dfba196ce0cb?q=80&w=800&auto=format&fit=crop",
          ],
        },
        {
          name: "Family Bunk Bed Room",
          description:
            "Kamar seru untuk liburan bersama teman atau anak-anak dengan tempat tidur bertingkat (bunk beds). AC dingin, loker aman, dan beanbag untuk bersantai.",
          capacity: 4,
          basePrice: 550000,
          roomImages: [
            "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=800&auto=format&fit=crop",
          ],
        },
      ],
    },
  ];

  // 3. Inject ke Database dengan Loop
  for (const p of propertiesData) {
    const { images, rooms, ...propertyInfo } = p;

    // Buat format creation untuk nested images property
    const propertyImagesToCreate = images.map((img) => ({ imageUrl: img }));

    // Buat format creation untuk nested rooms beserta room images-nya
    const roomsToCreate = rooms.map((room) => {
      const { roomImages, ...roomInfo } = room;
      return {
        ...roomInfo,
        images: {
          create: roomImages.map((img) => ({ imageUrl: img })),
        },
      };
    });

    const createdProperty = await prisma.property.create({
      data: {
        ...propertyInfo,
        images: { create: propertyImagesToCreate },
        rooms: { create: roomsToCreate },
      },
      include: { rooms: true },
    });

    console.log(
      `✅ Berhasil: ${createdProperty.name} di ${createdProperty.city}. Total: ${createdProperty.rooms.length} kamar.`,
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("==================================================");
    console.log("🔥 WOW! 5 Properti Beserta Kamarnya Berhasil Di-Inject!");
    console.log("==================================================");
  })
  .catch(async (e) => {
    console.error("❌ Terjadi Kesalahan saat Seeding! Error:");
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
