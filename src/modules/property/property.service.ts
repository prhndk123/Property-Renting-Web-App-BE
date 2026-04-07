import {
  PrismaClient,
  Prisma,
} from "../../../generated/prisma/client/index.js";
import { ApiError } from "../../utils/api-error.js";
import {
  CreatePropertyDto,
  GetPropertiesQueryDto,
  UpdatePropertyDto,
} from "./dto/property.dto.js";

export class PropertyService {
  constructor(private prisma: PrismaClient) {}

  private generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
  }

  async createProperty(tenantId: string, data: CreatePropertyDto) {
    const slug = this.generateSlug(data.name);
    return this.prisma.property.create({
      data: { ...data, tenantId, slug },
      include: { category: true, images: true },
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

    const where: Prisma.PropertyWhereInput = {
      city: city ? { contains: city, mode: "insensitive" } : undefined,
      name: search ? { contains: search, mode: "insensitive" } : undefined,
      category: categoryId
        ? /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
            categoryId,
          )
          ? { id: categoryId }
          : { name: { equals: categoryId, mode: "insensitive" } }
        : undefined,
      ...(Object.keys(roomFilter).length > 0 && {
        rooms: { some: roomFilter },
      }),
    };
    const orderBy: any = {};
    if (sortBy === "price" || sortBy === "rating") {
      orderBy.createdAt = sortOrder;
    } else {
      orderBy[sortBy] = sortOrder;
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
          _count: { select: { rooms: true } },
        },
      }),
      this.prisma.property.count({ where }),
    ]);
    return { data, meta: { page, take, total } };
  }

  async getPropertyBySlug(slug: string) {
    // If slug is a UUID, use getPropertyById instead
    const isUuid =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        slug,
      );
    if (isUuid) return this.getPropertyById(slug);

    const property = await this.prisma.property.findUnique({
      where: { slug },
      include: {
        category: true,
        images: true,
        rooms: { include: { images: true, availability: true } },
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
        rooms: { include: { images: true, availability: true } },
        tenant: { select: { name: true, profilePicture: true } },
      },
    });
    if (!property) throw new ApiError("Property not found", 404);
    return property;
  }

  async updateProperty(id: string, tenantId: string, data: UpdatePropertyDto) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new ApiError("Property not found", 404);
    if (property.tenantId !== tenantId) throw new ApiError("Unauthorized", 403);

    return this.prisma.property.update({
      where: { id },
      data,
      include: { category: true, images: true },
    });
  }

  async deleteProperty(id: string, tenantId: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new ApiError("Property not found", 404);
    if (property.tenantId !== tenantId) throw new ApiError("Unauthorized", 403);

    await this.prisma.property.delete({ where: { id } });
    return { message: "Property deleted successfully" };
  }

  async getCategories() {
    return this.prisma.propertyCategory.findMany();
  }
}
