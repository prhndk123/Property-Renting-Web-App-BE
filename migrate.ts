import "dotenv/config";
import { prisma } from "./src/lib/prisma.js";
import crypto from "crypto";

async function migrateData() {
  console.log("🚀 Memulai proses standarisasi data kategori...");

  try {
    // 1. Ambil semua kategori dari database menggunakan Raw SQL (karena schema sudah berubah)
    const oldCategories: any[] =
      await prisma.$queryRaw`SELECT * FROM property_categories`;

    console.log(`Ditemukan ${oldCategories.length} kategori lama.`);

    const masterMap = new Map();
    const defaults = [
      "Hotel",
      "Villa",
      "Resort",
      "Apartment",
      "Guesthouse",
      "Glamping",
    ];

    // 2. Pemetaan & Pembersihan Nama Kategori
    for (const cat of oldCategories) {
      const cleanName = cat.name.trim().toLowerCase();
      let stdName = cat.name;

      if (cleanName.includes("villa") || cleanName.includes("vila"))
        stdName = "Villa";
      else if (cleanName.includes("hotel") || cleanName.includes("htl"))
        stdName = "Hotel";
      else if (cleanName.includes("resort")) stdName = "Resort";
      else if (cleanName.includes("apart")) stdName = "Apartment";
      else if (cleanName.includes("guest") || cleanName.includes("kos"))
        stdName = "Guesthouse";
      else
        stdName =
          cat.name.charAt(0).toUpperCase() + cat.name.slice(1).toLowerCase();

      // Pilih satu ID sebagai "Master" untuk setiap nama standar
      if (!masterMap.has(stdName)) {
        masterMap.set(stdName, { id: cat.id, name: stdName });
      }
    }

    // Pastikan kategori default ada
    for (const def of defaults) {
      if (!masterMap.has(def)) {
        const newId = crypto.randomUUID();
        // Insert kategori baru menggunakan salah satu tenantId (atau sembarang UUID valid jika tidak ada tenant)
        const dummyTenantId =
          oldCategories.length > 0
            ? oldCategories[0].tenantId
            : "00000000-0000-0000-0000-000000000000";
        await prisma.$executeRawUnsafe(
          `INSERT INTO property_categories (id, "tenantId", name, "createdAt") VALUES ('${newId}', '${dummyTenantId}', '${def}', NOW())`,
        );
        masterMap.set(def, { id: newId, name: def });
      }
    }

    // 3. Update Properti yang ada ke Master Category ID yang benar
    const properties: any[] =
      await prisma.$queryRaw`SELECT p.id, c.name FROM properties p JOIN property_categories c ON p."categoryId" = c.id`;

    console.log(
      `Mengupdate ${properties.length} properti ke kategori terstandarisasi...`,
    );

    for (const p of properties) {
      const cleanName = p.name.trim().toLowerCase();
      let stdName = p.name;

      if (cleanName.includes("villa") || cleanName.includes("vila"))
        stdName = "Villa";
      else if (cleanName.includes("hotel") || cleanName.includes("htl"))
        stdName = "Hotel";
      else if (cleanName.includes("resort")) stdName = "Resort";
      else if (cleanName.includes("apart")) stdName = "Apartment";
      else if (cleanName.includes("guest") || cleanName.includes("kos"))
        stdName = "Guesthouse";
      else
        stdName =
          p.name.charAt(0).toUpperCase() + p.name.slice(1).toLowerCase();

      const masterId = masterMap.get(stdName)?.id;
      if (masterId) {
        await prisma.$executeRawUnsafe(
          `UPDATE properties SET "categoryId" = '${masterId}' WHERE id = '${p.id}'`,
        );
      }
    }

    // 4. Standarisasi nama Master Category
    for (const [name, data] of masterMap.entries()) {
      await prisma.$executeRawUnsafe(
        `UPDATE property_categories SET name = '${name}' WHERE id = '${data.id}'`,
      );
    }

    // 5. Hapus Kategori Lama yang tidak terpakai (Duplicates)
    const masterIds = Array.from(masterMap.values())
      .map((x) => `'${x.id}'`)
      .join(",");
    console.log("Menghapus kategori duplikat lama...");
    await prisma.$executeRawUnsafe(
      `DELETE FROM property_categories WHERE id NOT IN (${masterIds})`,
    );

    console.log(
      "✅ Data Cleansing Selesai! Duplikasi terhapus dan relasi properti aman.",
    );
  } catch (e) {
    console.error("Terjadi kesalahan migrasi:", e);
  } finally {
    await prisma.$disconnect();
  }
}

migrateData();
