import { PrismaClient, Prisma } from "@prisma/client";
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

    const page = Number(query.page) || 1;
    const take = Number(query.take) || 50;
    const search = query.search;

    const where: Prisma.TenantSubcategoryWhereInput = {
      deletedAt: null,
      ...(tenantId ? { tenantId } : {}),
      ...(search
        ? { name: { contains: search, mode: "insensitive" as const } }
        : {}),
    };

    try {
      const [data, total] = await Promise.all([
        this.prisma.tenantSubcategory.findMany({
          where,
          take,
          skip: (page - 1) * take,
          orderBy: { name: "asc" },
          include: {
            _count: { select: { properties: true } },
            category: true, // Include the master category relation
          },
        }),
        this.prisma.tenantSubcategory.count({ where }),
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
    } catch (error) {
      throw error;
    }
  }

  async getCategoryById(id: string) {
    const category = await this.prisma.tenantSubcategory.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { properties: true } }, category: true },
    });
    if (!category) throw new ApiError("Category not found", 404);
    return category;
  }

  async createCategory(tenantId: string, data: CreateCategoryDto) {
    const trimmedName = data.name.trim();
    const formattedName =
      trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1).toLowerCase();

    const existing = await this.prisma.tenantSubcategory.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        name: { equals: trimmedName, mode: "insensitive" as Prisma.QueryMode },
      },
    });

    if (existing) {
      throw new ApiError("Category with this name already exists", 409);
    }

    const { masterCategoryId } = data as any; // Still using cast for now to avoid TS errors if DTO is not yet picked up by runtime

    return this.prisma.tenantSubcategory.create({
      data: {
        name: formattedName,
        tenantId,
        categoryId: data.categoryId,
      },
      include: { _count: { select: { properties: true } }, category: true },
    });
  }

  async updateCategory(id: string, tenantId: string, data: UpdateCategoryDto) {
    const category = await this.prisma.tenantSubcategory.findFirst({
      where: { id, deletedAt: null },
    });
    if (!category) throw new ApiError("Category not found", 404);
    if (category.tenantId !== tenantId) throw new ApiError("Unauthorized", 403);

    let formattedName = data.name;
    if (data.name) {
      const trimmedName = data.name.trim();
      formattedName =
        trimmedName.charAt(0).toUpperCase() +
        trimmedName.slice(1).toLowerCase();

      const existing = await this.prisma.tenantSubcategory.findFirst({
        where: {
          tenantId,
          deletedAt: null,
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

    const masterCategoryId = (data as any).categoryId;

    return this.prisma.tenantSubcategory.update({
      where: { id },
      data: {
        ...(formattedName && { name: formattedName }),
        ...(masterCategoryId && { categoryId: masterCategoryId }),
      },
      include: { _count: { select: { properties: true } }, category: true },
    });
  }

  async deleteCategory(id: string, tenantId: string) {
    const category = await this.prisma.tenantSubcategory.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { properties: { where: { deletedAt: null } } } },
      },
    });
    if (!category) throw new ApiError("Category not found", 404);
    if (category.tenantId !== tenantId) throw new ApiError("Unauthorized", 403);
    if (category._count.properties > 0) {
      throw new ApiError(
        "Cannot delete category with existing properties. Remove or reassign properties first.",
        400,
      );
    }

    await this.prisma.tenantSubcategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Category deleted successfully (soft delete)" };
  }
}
