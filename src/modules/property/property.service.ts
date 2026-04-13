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
      city,
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
      city: city ? { contains: city, mode: "insensitive" } : undefined,
      name: search ? { contains: search, mode: "insensitive" } : undefined,
      ...categoryWhere,
      // Must have at least one room
      rooms: {
        some: {
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

  async getPropertyBySlug(slug: string) {
    const property = await this.prisma.property.findUnique({
      where: { slug },
      include: {
        category: true,
        images: true,
        rooms: { include: { images: true } },
        tenant: { select: { name: true, profilePicture: true } },
      },
    });
    if (!property) throw new ApiError("Property not found", 404);
    return property;
  }

  async getPropertyById(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        category: true,
        images: true,
        rooms: { include: { images: true } },
        tenant: { select: { name: true, profilePicture: true } },
      },
    });
    if (!property) throw new ApiError("Property not found", 404);
    return property;
  }

  async updateProperty(id: string, tenantId: string, data: UpdatePropertyDto) {
    const property = await this.prisma.property.findUnique({
      where: { id },
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
    const property = await this.prisma.property.findUnique({
      where: { id },
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

    await this.prisma.property.delete({ where: { id } });
    return { message: "Property deleted successfully" };
  }

  async getCategories() {
    return this.prisma.propertyCategory.findMany();
  }

  async getTenantProperties(
    tenantId: string,
    query: GetTenantPropertiesQueryDto,
  ) {
    const { page, take, search, categoryId, sortBy, sortOrder } = query;

    const where: Prisma.PropertyWhereInput = {
      tenantId,
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
    const whereClause = search
      ? { city: { contains: search, mode: Prisma.QueryMode.insensitive } }
      : {};

    const properties = await this.prisma.property.findMany({
      where: whereClause,
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" },
      take: 10, // Limit to 10 results for scalable UI
    });

    return properties.map((p) => ({
      label: p.city,
      value: p.city.toLowerCase(),
    }));
  }
}
