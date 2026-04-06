import { Request, Response } from "express";
import { PropertyService } from "./property.service.js";
import { AuthRequest } from "../../middlewares/auth.middleware.js";

export class PropertyController {
  constructor(private propertyService: PropertyService) {}

  createProperty = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    const result = await this.propertyService.createProperty(
      tenantId,
      req.body,
    );
    res.status(201).send(result);
  };

  getProperties = async (req: Request, res: Response) => {
    const result = await this.propertyService.getProperties(req.query as any);
    res.status(200).send(result);
  };

  getPropertyBySlug = async (req: Request, res: Response) => {
    const result = await this.propertyService.getPropertyBySlug(
      req.params.slug as string,
    );
    res.status(200).send(result);
  };

  updateProperty = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    const result = await this.propertyService.updateProperty(
      req.params.id as string,
      tenantId,
      req.body,
    );
    res.status(200).send(result);
  };

  deleteProperty = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    const result = await this.propertyService.deleteProperty(
      req.params.id as string,
      tenantId,
    );
    res.status(200).send(result);
  };

  getCategories = async (req: Request, res: Response) => {
    const result = await this.propertyService.getCategories();
    res.status(200).send(result);
  };
}
