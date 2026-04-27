import { Request, Response } from "express";
import { PropertyService } from "./property.service.js";
import { AuthRequest } from "../../middlewares/auth.middleware.js";
import { CloudinaryService } from "../cloudinary/cloudinary.service.js";

export class PropertyController {
  constructor(
    private propertyService: PropertyService,
    private cloudinaryService: CloudinaryService,
  ) {}

  createProperty = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    const imageUrls: string[] = [];

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const uploadResult = await this.cloudinaryService.upload(file);
        imageUrls.push(uploadResult.secure_url);
      }
    }

    const payload = { ...req.body, imageUrls };

    const result = await this.propertyService.createProperty(tenantId, payload);
    res.status(201).send(result);
  };

  getProperties = async (req: Request, res: Response) => {
    const result = await this.propertyService.getProperties(req.query as any);
    res.status(200).send(result);
  };

  getPropertyBySlug = async (req: Request, res: Response) => {
    const result = await this.propertyService.getPropertyBySlug(
      req.params.slug as string,
      req.query as any,
    );
    res.status(200).send(result);
  };

  getPropertyById = async (req: Request, res: Response) => {
    const result = await this.propertyService.getPropertyById(
      req.params.id as string,
      req.query as any,
    );
    res.status(200).send(result);
  };

  updateProperty = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    const imageUrls: string[] = [];

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const uploadResult = await this.cloudinaryService.upload(file);
        imageUrls.push(uploadResult.secure_url);
      }
    }

    const payload = { ...req.body };
    if (imageUrls.length > 0) {
      payload.imageUrls = imageUrls;
    }

    const result = await this.propertyService.updateProperty(
      req.params.id as string,
      tenantId,
      payload,
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

  getTenantProperties = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    const result = await this.propertyService.getTenantProperties(
      tenantId,
      req.query as any,
    );
    res.status(200).send(result);
  };

  getCategories = async (req: Request, res: Response) => {
    const result = await this.propertyService.getCategories();
    res.status(200).send(result);
  };

  getLocations = async (req: Request, res: Response) => {
    const search = req.query.search as string | undefined;
    const result = await this.propertyService.getLocations(search);
    res.status(200).send(result);
  };

  toggleSaveProperty = async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).user?.id!;
    const result = await this.propertyService.toggleSaveProperty(
      req.params.id as string,
      userId,
    );
    res.status(200).send(result);
  };
}
