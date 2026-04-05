import { PrismaClient, Prisma } from "../../generated/prisma/client.js";
import { ApiError } from "../../utils/api-error.js";
import {
  CreatePropertyDto,
  GetPropertiesQueryDto,
  UpdatePropertyDto,
} from "../../dto/property.dto.js";

export class PropertyService {
  constructor(private prisma: PrismaClient) {}

  async createProperty(tenantId: string, data: CreatePropertyDto) {
    return this.prisma.property.create({
      data: { ...data, tenantId },
      include: { category: true, images: true },
    });
  }

  async getProperties(query: GetPropertiesQueryDto) {
    const { page, take, sortBy, sortOrder, city, categoryId, search } = query;
    const where: Prisma.PropertyWhereInput = {
      city: city ? { contains: city, mode: "insensitive" } : undefined,
      categoryId,
      name: search ? { contains: search, mode: "insensitive" } : undefined,
    };
    const [data, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        take,
        skip: (page - 1) * take,
        orderBy: { [sortBy]: sortOrder },
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
