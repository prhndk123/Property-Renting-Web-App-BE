import {
  PrismaClient,
  Prisma,
} from "../../../generated/prisma/client/index.js";
import { ApiError } from "../../utils/api-error.js";
import {
  CreateCategoryDto,
  GetCategoriesQueryDto,
  UpdateCategoryDto,
} from "./dto/category.dto.js";

export class CategoryService {
  constructor(private prisma: PrismaClient) {}

  async getCategories(query: GetCategoriesQueryDto, tenantId?: string) {
    console.log("[CategoryService] Starting getCategories with params:", {
      query,
      tenantId,
    });

    // Ensure numeric types for pagination
    const page = Number(query.page) || 1;
    const take = Number(query.take) || 50;
    const search = query.search;

    console.log("[CategoryService] Sanitized params:", { page, take, search });

    const where: Prisma.PropertyCategoryWhereInput = {
      ...(tenantId ? { tenantId } : {}),
      ...(search
        ? { name: { contains: search, mode: "insensitive" as const } }
        : {}),
    };

    try {
      console.log("[CategoryService] Executing DB query...");
      const [data, total] = await Promise.all([
        this.prisma.propertyCategory.findMany({
          where,
          take,
          skip: (page - 1) * take,
          orderBy: { name: "asc" },
          include: {
            _count: { select: { properties: true } },
          },
        }),
        this.prisma.propertyCategory.count({ where }),
      ]);
      console.log("[CategoryService] DB query successful. Count:", total);

      return {
        data,
        meta: {
          page,
          take,
          total,
          totalPages: Math.max(1, Math.ceil(total / take)),
        },
      };
    } catch (error) {
      console.error("[CategoryService] DB Query failed:", error);
      throw error;
    }
  }

  async getCategoryById(id: string) {
    const category = await this.prisma.propertyCategory.findUnique({
      where: { id },
      include: { _count: { select: { properties: true } } },
    });
    if (!category) throw new ApiError("Category not found", 404);
    return category;
  }

  async createCategory(tenantId: string, data: CreateCategoryDto) {
    const trimmedName = data.name.trim();
    const formattedName =
      trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1).toLowerCase();

    // Check for duplicate name within the same tenant (case-insensitive)
    const existing = await this.prisma.propertyCategory.findFirst({
      where: {
        tenantId,
        name: { equals: trimmedName, mode: "insensitive" as Prisma.QueryMode },
      },
    });

    if (existing) {
      throw new ApiError("Category with this name already exists", 409);
    }

    return this.prisma.propertyCategory.create({
      data: { ...data, name: formattedName, tenantId },
      include: { _count: { select: { properties: true } } },
    });
  }

  async updateCategory(id: string, tenantId: string, data: UpdateCategoryDto) {
    const category = await this.prisma.propertyCategory.findUnique({
      where: { id },
    });
    if (!category) throw new ApiError("Category not found", 404);
    if (category.tenantId !== tenantId) throw new ApiError("Unauthorized", 403);

    let formattedName = data.name;
    if (data.name) {
      const trimmedName = data.name.trim();
      formattedName =
        trimmedName.charAt(0).toUpperCase() +
        trimmedName.slice(1).toLowerCase();

      const existing = await this.prisma.propertyCategory.findFirst({
        where: {
          tenantId,
          name: {
            equals: trimmedName,
            mode: "insensitive" as Prisma.QueryMode,
          },
        },
      });
      if (existing && existing.id !== id) {
        throw new ApiError("Category with this name already exists", 409);
      }
    }

    return this.prisma.propertyCategory.update({
      where: { id },
      data: { ...data, ...(formattedName && { name: formattedName }) },
      include: { _count: { select: { properties: true } } },
    });
  }

  async deleteCategory(id: string, tenantId: string) {
    const category = await this.prisma.propertyCategory.findUnique({
      where: { id },
      include: { _count: { select: { properties: true } } },
    });
    if (!category) throw new ApiError("Category not found", 404);
    if (category.tenantId !== tenantId) throw new ApiError("Unauthorized", 403);
    if (category._count.properties > 0) {
      throw new ApiError(
        "Cannot delete category with existing properties. Remove or reassign properties first.",
        400,
      );
    }

    await this.prisma.propertyCategory.delete({ where: { id } });
    return { message: "Category deleted successfully" };
  }
}
