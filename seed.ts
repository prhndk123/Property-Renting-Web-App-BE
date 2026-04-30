import "dotenv/config";
import { prisma } from "./src/lib/prisma.js";

async function main() {
  console.log("Memulai proses seeding untuk 5 properti...");

  // 1. Cari Tenant berdasarkan Email
  const tenantEmail = "prihandikavahryansyah@gmail.com";
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
    HOTEL: "571a27b4-cd4a-468f-a772-ce321ec0ff97",
    VILLA: "e01dcd09-973a-4303-a0da-f18a9c45c439",
    RESORT: "b4b2719a-1d00-4110-843c-29086168111d",
    APARTMENT: "fd5f2083-4af6-4720-aad0-9688b6a43089",
    GUESTHOUSE: "c917acfd-c698-467b-aa5f-0363dac5549e",
  };

  console.log("Upserting Master Categories...");
  const categories = [
    { id: CATEGORY.HOTEL, name: "Hotel" },
    { id: CATEGORY.VILLA, name: "Villa" },
    { id: CATEGORY.RESORT, name: "Resort" },
    { id: CATEGORY.APARTMENT, name: "Apartment" },
    { id: CATEGORY.GUESTHOUSE, name: "Guesthouse" },
  ];

  for (const cat of categories) {
    await prisma.propertyCategory.upsert({
      where: { id: cat.id },
      update: { name: cat.name },
      create: { id: cat.id, name: cat.name },
    });
  }

  // 2. Siapkan Data 5 Properti
  const propertiesData = [
    // --- 1. HOTEL (BANDUNG) ---
    {
      tenantId,
      categoryId: CATEGORY.HOTEL,
      name: "Nusantara Alpine Grand Hotel",
      slug: `nusantara-alpine-grand`,
      description:
        "Hotel premium bernuansa pegunungan di Bandung yang menghadirkan kesejukan alami dalam balutan kemewahan modern. Dikelola oleh Nusantara Property Group, properti ini menawarkan pengalaman menginap eksklusif dengan panoramic mountain view, infinity heated pool, serta executive lounge berstandar internasional.",
      address: "Jl. Dago Atas No. 88, Bandung",
      city: "Bandung",
      latitude: -6.865,
      longitude: 107.615,
      images: [
        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa",
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791",
      ],
      rooms: [
        {
          name: "Mountain View Executive Room",
          description:
            "Kamar elegan dengan panorama pegunungan Bandung, dilengkapi premium bedding, smart TV, dan workspace ergonomis.",
          capacity: 2,
          basePrice: 1400000,
          roomImages: [
            "https://images.unsplash.com/photo-1590490360182-c33d57733427",
          ],
        },
        {
          name: "Royal Panorama Suite",
          description:
            "Suite eksklusif dengan balkon luas, ruang tamu privat, dan bathroom berlapis marmer. Ideal untuk tamu premium.",
          capacity: 4,
          basePrice: 4200000,
          roomImages: [
            "https://images.unsplash.com/photo-1578898887932-dce23a595ad4",
          ],
        },
      ],
    },

    // --- 2. VILLA (LOMBOK) ---
    {
      tenantId,
      categoryId: CATEGORY.VILLA,
      name: "Nusantara Azure Cliff Villa",
      slug: `nusantara-azure-cliff`,
      description:
        "Villa eksklusif di tepi tebing Lombok dengan pemandangan laut lepas yang dramatis. Dirancang untuk menghadirkan privasi total, properti ini dilengkapi infinity pool pribadi dan desain arsitektur tropis modern.",
      address: "Jl. Pantai Selong Belanak, Lombok",
      city: "Lombok",
      latitude: -8.892,
      longitude: 116.276,
      images: [
        "https://images.unsplash.com/photo-1505691938895-1758d7feb511",
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
      ],
      rooms: [
        {
          name: "Cliff Private Pool Villa",
          description:
            "Villa dengan infinity pool menghadap laut, outdoor lounge, dan bedroom dengan full glass window.",
          capacity: 2,
          basePrice: 3200000,
          roomImages: [
            "https://images.unsplash.com/photo-1613977257363-707ba9348227",
          ],
        },
        {
          name: "Ocean Family Retreat Villa",
          description:
            "Villa luas dengan dua kamar tidur, ruang keluarga, dan akses langsung ke private deck tepi tebing.",
          capacity: 4,
          basePrice: 4800000,
          roomImages: [
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
          ],
        },
      ],
    },

    // --- 3. RESORT (LABUAN BAJO) ---
    {
      tenantId,
      categoryId: CATEGORY.RESORT,
      name: "Nusantara Komodo Bay Resort",
      slug: `nusantara-komodo-bay`,
      description:
        "Resort eksklusif di Labuan Bajo yang menawarkan pengalaman liburan kelas dunia. Dengan akses langsung ke laut biru jernih dan aktivitas island hopping, properti ini menjadi destinasi utama wisata premium Indonesia.",
      address: "Labuan Bajo, NTT",
      city: "Labuan Bajo",
      latitude: -8.497,
      longitude: 119.887,
      images: [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
        "https://images.unsplash.com/photo-1519046904884-53103b34b206",
      ],
      rooms: [
        {
          name: "Seaview Luxury Cabin",
          description:
            "Kamar modern dengan pemandangan laut terbuka, dilengkapi terrace pribadi.",
          capacity: 2,
          basePrice: 3600000,
          roomImages: [
            "https://images.unsplash.com/photo-1566665797739-1674de7a421a",
          ],
        },
        {
          name: "Sunset Horizon Suite",
          description:
            "Suite premium dengan akses langsung ke pantai dan area lounge pribadi.",
          capacity: 2,
          basePrice: 5000000,
          roomImages: [
            "https://images.unsplash.com/photo-1571508601891-ca5e7a713859",
          ],
        },
      ],
    },

    // --- 4. APARTMENT (SURABAYA) ---
    {
      tenantId,
      categoryId: CATEGORY.APARTMENT,
      name: "Nusantara Urban Heights Apartment",
      slug: `nusantara-urban-heights`,
      description:
        "Apartemen modern di pusat kota Surabaya yang dirancang untuk gaya hidup urban. Mengusung konsep smart living dengan fasilitas lengkap seperti co-working space, sky garden, dan fitness center.",
      address: "Jl. Basuki Rahmat No. 12, Surabaya",
      city: "Surabaya",
      latitude: -7.257,
      longitude: 112.752,
      images: [
        "https://images.unsplash.com/photo-1493809842364-78817add7ffb",
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
      ],
      rooms: [
        {
          name: "Urban Studio Smart Room",
          description:
            "Studio modern dengan desain minimalis dan sistem smart home terintegrasi.",
          capacity: 2,
          basePrice: 750000,
          roomImages: [
            "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
          ],
        },
        {
          name: "Executive City Suite",
          description:
            "Unit luas dengan ruang tamu dan city view, cocok untuk profesional dan keluarga.",
          capacity: 4,
          basePrice: 1600000,
          roomImages: [
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267",
          ],
        },
      ],
    },

    // --- 5. GUESTHOUSE (MALANG) ---
    {
      tenantId,
      categoryId: CATEGORY.GUESTHOUSE,
      name: "Nusantara Heritage Stay Malang",
      slug: `nusantara-heritage-malang`,
      description:
        "Guesthouse bergaya heritage dengan sentuhan modern di kota Malang. Menghadirkan suasana hangat dan nyaman dengan pelayanan khas Nusantara yang ramah.",
      address: "Jl. Ijen Boulevard No. 21, Malang",
      city: "Malang",
      latitude: -7.966,
      longitude: 112.632,
      images: [
        "https://images.unsplash.com/photo-1560185127-6ed189bf02f4",
        "https://images.unsplash.com/photo-1505691723518-36a5ac3b2c41",
      ],
      rooms: [
        {
          name: "Classic Comfort Room",
          description:
            "Kamar nyaman dengan desain klasik modern dan fasilitas lengkap.",
          capacity: 2,
          basePrice: 300000,
          roomImages: [
            "https://images.unsplash.com/photo-1590490360182-c33d57733427",
          ],
        },
        {
          name: "Family Heritage Room",
          description:
            "Kamar luas dengan nuansa heritage, cocok untuk keluarga kecil.",
          capacity: 4,
          basePrice: 550000,
          roomImages: [
            "https://images.unsplash.com/photo-1555854877-bab0e564b8d5",
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
