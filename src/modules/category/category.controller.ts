import { Request, Response } from "express";
import { CategoryService } from "./category.service.js";
import { AuthRequest } from "../../middlewares/auth.middleware.js";

export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  getCategories = async (req: Request, res: Response) => {
    try {
      console.log("[CategoryController] getCategories hit. Query:", req.query);
      const tenantId = req.query.tenantId as string | undefined;
      const result = await this.categoryService.getCategories(
        req.query as any,
        tenantId,
      );
      console.log("[CategoryController] getCategories success.");
      res.status(200).send(result);
    } catch (error) {
      console.error("[CategoryController] Error in getCategories:", error);
      res.status(500).json({
        message: "Internal Server Error in getCategories",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  getCategoryById = async (req: Request, res: Response) => {
    const result = await this.categoryService.getCategoryById(
      req.params.id as string,
    );
    res.status(200).send(result);
  };

  createCategory = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    const result = await this.categoryService.createCategory(
      tenantId,
      req.body,
    );
    res.status(201).send(result);
  };

  updateCategory = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    const result = await this.categoryService.updateCategory(
      req.params.id as string,
      tenantId,
      req.body,
    );
    res.status(200).send(result);
  };

  deleteCategory = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    const result = await this.categoryService.deleteCategory(
      req.params.id as string,
      tenantId,
    );
    res.status(200).send(result);
  };
}
