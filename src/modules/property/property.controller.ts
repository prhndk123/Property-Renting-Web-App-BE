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
    let imageUrl: string | undefined;

    if (req.file) {
      const uploadResult = await this.cloudinaryService.upload(req.file);
      imageUrl = uploadResult.secure_url;
    }

    const payload = { ...req.body, imageUrl };

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
    );
    res.status(200).send(result);
  };

  getPropertyById = async (req: Request, res: Response) => {
    const result = await this.propertyService.getPropertyById(
      req.params.id as string,
    );
    res.status(200).send(result);
  };

  updateProperty = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    let imageUrl: string | undefined;

    if (req.file) {
      const uploadResult = await this.cloudinaryService.upload(req.file);
      imageUrl = uploadResult.secure_url;
    }

    const payload = { ...req.body };
    if (imageUrl) {
      payload.imageUrl = imageUrl;
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
}
