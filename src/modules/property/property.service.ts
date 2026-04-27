import {
  PrismaClient,
  Prisma,
} from "../../../generated/prisma/client/index.js";
import { ApiError } from "../../utils/api-error.js";
import {
  CreatePropertyDto,
  GetPropertiesQueryDto,
  GetTenantPropertiesQueryDto,
  UpdatePropertyDto,
} from "./dto/property.dto.js";

import { CloudinaryService } from "../cloudinary/cloudinary.service.js";

export class PropertyService {
  constructor(
    private prisma: PrismaClient,
    private cloudinaryService: CloudinaryService,
  ) {}

  private generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
  }

  async createProperty(tenantId: string, data: CreatePropertyDto) {
    const { imageUrls, ...propertyData } = data;
    const slug = this.generateSlug(data.name);

    return this.prisma.$transaction(async (tx) => {
      const property = await tx.property.create({
        data: { ...propertyData, tenantId, slug },
        include: { category: true },
      });

      if (imageUrls && imageUrls.length > 0) {
        await tx.propertyImage.createMany({
          data: imageUrls.map((url) => ({
            propertyId: property.id,
            imageUrl: url,
          })),
        });
      }

      return tx.property.findUnique({
        where: { id: property.id },
        include: { category: true, images: true },
      });
    });
  }

  async getProperties(query: GetPropertiesQueryDto) {
    const {
      page,
      take,
      sortBy,
      sortOrder,
      destination,
      categoryId,
      search,
      startDate,
      endDate,
      capacity,
    } = query;

    // ── Build room-level filters ──
    const roomFilter: any = {};
    if (capacity) roomFilter.capacity = { gte: capacity };
    if (startDate && endDate) {
      roomFilter.availability = {
        none: {
          date: { gte: new Date(startDate), lt: new Date(endDate) },
          isAvailable: false,
        },
      };
    }

    // ── Parse multi-category filter ──
    let categoryWhere: Prisma.PropertyWhereInput | undefined;
    if (categoryId) {
      const categories = categoryId.split(",").map((c) => c.trim());
      const uuidRegex =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

      const uuids = categories.filter((c) => uuidRegex.test(c));
      const names = categories.filter((c) => !uuidRegex.test(c));

      const orConditions: Prisma.PropertyWhereInput[] = [];
      if (uuids.length > 0) {
        orConditions.push({ categoryId: { in: uuids } });
      }
      if (names.length > 0) {
        orConditions.push({
          category: { name: { in: names, mode: "insensitive" } },
        });
      }

      if (orConditions.length === 1) {
        categoryWhere = orConditions[0];
      } else if (orConditions.length > 1) {
        categoryWhere = { OR: orConditions };
      }
    }

    // ── Build WHERE clause ──
    // Only show properties that have at least one room (i.e., some availability)
    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      city: destination
        ? { contains: destination, mode: "insensitive" }
        : undefined,
      name: search ? { contains: search, mode: "insensitive" } : undefined,
      ...categoryWhere,
      // Must have at least one room
      rooms: {
        some: {
          deletedAt: null,
          ...roomFilter,
        },
      },
    };

    // ── Sorting ──
    // For "name" and "createdAt", we can sort directly via Prisma.
    // For "price", we sort in application layer after computing lowestPrice.
    const isPriceSort = sortBy === "price";
    let orderBy: any = {};
    if (!isPriceSort) {
      if (sortBy === "name") {
        orderBy = { name: sortOrder };
      } else {
        orderBy = { createdAt: sortOrder };
      }
    }

    // ── Fetch data ──
    if (isPriceSort) {
      // For price sorting, we need to fetch all matching properties first,
      // compute lowestPrice, sort, then paginate in application layer.
      const allProperties = await this.prisma.property.findMany({
        where,
        include: {
          category: true,
          images: true,
          rooms: {
            select: { basePrice: true },
          },
          reviews: {
            select: { rating: true },
          },
          _count: { select: { rooms: true, reviews: true } },
        },
      });

      // Enrich with computed fields
      const enriched = allProperties.map((p) => this.enrichProperty(p));

      // Sort by price
      enriched.sort((a, b) => {
        return sortOrder === "asc"
          ? a.lowestPrice - b.lowestPrice
          : b.lowestPrice - a.lowestPrice;
      });

      const total = enriched.length;
      const totalPages = Math.max(1, Math.ceil(total / take));
      const paginated = enriched.slice((page - 1) * take, page * take);

      return {
        data: paginated,
        meta: { page, take, total, totalPages },
      };
    } else {
      // For name/createdAt sorting, use Prisma pagination directly
      const [rawData, total] = await Promise.all([
        this.prisma.property.findMany({
          where,
          take,
          skip: (page - 1) * take,
          orderBy,
          include: {
            category: true,
            images: true,
            rooms: {
              select: { basePrice: true },
            },
            reviews: {
              select: { rating: true },
            },
            _count: { select: { rooms: true, reviews: true } },
          },
        }),
        this.prisma.property.count({ where }),
      ]);

      const data = rawData.map((p) => this.enrichProperty(p));
      const totalPages = Math.max(1, Math.ceil(total / take));

      return {
        data,
        meta: { page, take, total, totalPages },
      };
    }
  }

  /**
   * Enrich a raw property with computed fields:
   * - lowestPrice: min basePrice across all rooms
   * - isAvailable: always true (filtered in WHERE already)
   * - averageRating: average of all review ratings
   * - reviewCount: number of reviews
   */
  private enrichProperty(property: any) {
    const rooms = property.rooms || [];
    const reviews = property.reviews || [];

    const lowestPrice =
      rooms.length > 0
        ? Math.min(...rooms.map((r: any) => Number(r.basePrice)))
        : 0;

    const reviewCount = reviews.length;
    const averageRating =
      reviewCount > 0
        ? Math.round(
            (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) /
              reviewCount) *
              10,
          ) / 10
        : 0;

    // Remove raw rooms/reviews arrays from response to keep it clean
    const { rooms: _rooms, reviews: _reviews, ...rest } = property;

    return {
      ...rest,
      lowestPrice,
      isAvailable: true, // only available properties pass the WHERE filter
      averageRating,
      reviewCount,
    };
  }

  async getPropertyBySlug(slug: string, query?: any) {
    // If slug is a UUID, use getPropertyById instead
    const isUuid =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        slug,
      );
    if (isUuid) return this.getPropertyById(slug, query);

    const { startDate, endDate } = query || {};

    const property = await this.prisma.property.findFirst({
      where: { slug, deletedAt: null },
      include: {
        category: true,
        images: true,
        rooms: {
          where: { deletedAt: null },
          include: { images: true, inventories: true, peakSeasonRates: true },
        },
        tenant: { select: { name: true, profilePicture: true } },
      },
    });
    if (!property) throw new ApiError("Property not found", 404);

    // Filter available rooms in memory based on inventory
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      property.rooms = property.rooms.filter((room) => {
        let isAvailable = true;
        // Check each night
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          const dStr = d.toISOString().split("T")[0];
          const inv = room.inventories.find(
            (i) => i.date.toISOString().split("T")[0] === dStr,
          );
          const totalStock = inv?.totalStock === 0 ? 0 : room.qty;
          const bookedStock = inv?.bookedStock ?? 0;
          if (totalStock - bookedStock < 1) {
            isAvailable = false;
            break;
          }
        }
        return isAvailable;
      });
    }

    return property;
  }

  async getPropertyById(id: string, query?: any) {
    const { startDate, endDate } = query || {};

    const property = await this.prisma.property.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        images: true,
        rooms: {
          where: { deletedAt: null },
          include: { images: true, inventories: true, peakSeasonRates: true },
        },
        tenant: { select: { name: true, profilePicture: true } },
      },
    });
    if (!property) throw new ApiError("Property not found", 404);

    // Filter available rooms in memory based on inventory
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      property.rooms = property.rooms.filter((room) => {
        let isAvailable = true;
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          const dStr = d.toISOString().split("T")[0];
          const inv = room.inventories.find(
            (i) => i.date.toISOString().split("T")[0] === dStr,
          );
          const totalStock = inv?.totalStock === 0 ? 0 : room.qty;
          const bookedStock = inv?.bookedStock ?? 0;
          if (totalStock - bookedStock < 1) {
            isAvailable = false;
            break;
          }
        }
        return isAvailable;
      });
    }

    return property;
  }

  async updateProperty(id: string, tenantId: string, data: UpdatePropertyDto) {
    const property = await this.prisma.property.findFirst({
      where: { id, deletedAt: null },
      include: { images: true },
    });
    if (!property) throw new ApiError("Property not found", 404);
    if (property.tenantId !== tenantId) throw new ApiError("Unauthorized", 403);

    const { imageUrls, removedImageIds, ...updateData } = data;

    return this.prisma.$transaction(async (tx) => {
      // Update property basic info
      await tx.property.update({
        where: { id },
        data: updateData,
      });

      // Handle removed images
      if (removedImageIds && removedImageIds.length > 0) {
        const imagesToRemove = property.images.filter((img) =>
          removedImageIds.includes(img.id),
        );

        for (const img of imagesToRemove) {
          try {
            await this.cloudinaryService.removeByUrl(img.imageUrl);
          } catch (e) {
            console.error("Failed to delete image from cloudinary:", e);
          }
        }

        await tx.propertyImage.deleteMany({
          where: { id: { in: removedImageIds } },
        });
      }

      // Add new images
      if (imageUrls && imageUrls.length > 0) {
        await tx.propertyImage.createMany({
          data: imageUrls.map((url) => ({
            propertyId: id,
            imageUrl: url,
          })),
        });
      }

      return tx.property.findUnique({
        where: { id },
        include: { category: true, images: true },
      });
    });
  }

  async deleteProperty(id: string, tenantId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, deletedAt: null },
      include: { images: true },
    });
    if (!property) throw new ApiError("Property not found", 404);
    if (property.tenantId !== tenantId) throw new ApiError("Unauthorized", 403);

    // Delete all images from cloudinary
    for (const img of property.images) {
      try {
        await this.cloudinaryService.removeByUrl(img.imageUrl);
      } catch (e) {
        console.error(
          "Failed to delete property image during property deletion:",
          e,
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.property.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
      this.prisma.room.updateMany({
        where: { propertyId: id },
        data: { deletedAt: new Date() },
      }),
    ]);
    return { message: "Property deleted successfully (soft delete)" };
  }

  async getCategories() {
    return this.prisma.propertyCategory.findMany({
      where: { deletedAt: null },
    });
  }

  async getTenantProperties(
    tenantId: string,
    query: GetTenantPropertiesQueryDto,
  ) {
    const { page, take, search, categoryId, sortBy, sortOrder } = query;

    const where: Prisma.PropertyWhereInput = {
      tenantId,
      deletedAt: null,
      ...(search
        ? { name: { contains: search, mode: "insensitive" as const } }
        : {}),
      ...(categoryId ? { categoryId } : {}),
    };

    let orderBy: any = {};
    if (sortBy === "name") {
      orderBy = { name: sortOrder };
    } else {
      orderBy = { createdAt: sortOrder };
    }

    const [data, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        take,
        skip: (page - 1) * take,
        orderBy,
        include: {
          category: true,
          images: true,
          _count: {
            select: { rooms: true, reviews: true, reservations: true },
          },
        },
      }),
      this.prisma.property.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        take,
        total,
        totalPages: Math.max(1, Math.ceil(total / take)),
      },
    };
  }

  async getLocations(search?: string) {
    const whereClause: Prisma.PropertyWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            city: {
              contains: search,
              mode: Prisma.QueryMode.insensitive as Prisma.QueryMode,
            },
          }
        : {}),
    };

    const properties = await this.prisma.property.findMany({
      where: whereClause,
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" },
      take: 10,
    });

    return properties.map((p) => ({
      label: p.city,
      value: p.city.toLowerCase(),
    }));
  }

  async toggleSaveProperty(id: string, userId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, deletedAt: null },
    });
    if (!property) throw new ApiError("Property not found", 404);

    const existing = await this.prisma.savedProperty.findUnique({
      where: {
        userId_propertyId: {
          userId,
          propertyId: id,
        },
      },
    });

    if (existing && !existing.deletedAt) {
      await this.prisma.savedProperty.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });
      return { isSaved: false, message: "Property removed from saved." };
    } else if (existing && existing.deletedAt) {
      await this.prisma.savedProperty.update({
        where: { id: existing.id },
        data: { deletedAt: null },
      });
      return { isSaved: true, message: "Property saved successfully." };
    } else {
      await this.prisma.savedProperty.create({
        data: {
          userId,
          propertyId: id,
        },
      });
      return { isSaved: true, message: "Property saved successfully." };
    }
  }
}
