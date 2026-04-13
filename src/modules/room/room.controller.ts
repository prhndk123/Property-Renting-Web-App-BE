import { Request, Response } from "express";
import { RoomService } from "./room.service.js";
import { AuthRequest } from "../../middlewares/auth.middleware.js";
import { CloudinaryService } from "../cloudinary/cloudinary.service.js";

export class RoomController {
  constructor(
    private roomService: RoomService,
    private cloudinaryService: CloudinaryService,
  ) {}

  createRoom = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    const imageUrls: string[] = [];

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const uploadResult = await this.cloudinaryService.upload(file);
        imageUrls.push(uploadResult.secure_url);
      }
    }

    const payload = { ...req.body, imageUrls };
    const result = await this.roomService.createRoom(tenantId, payload);
    res.status(201).send(result);
  };

  getRoomById = async (req: Request, res: Response) => {
    const result = await this.roomService.getRoomById(req.params.id as string);
    res.status(200).send(result);
  };

  updateRoom = async (req: Request, res: Response) => {
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

    const result = await this.roomService.updateRoom(
      req.params.id as string,
      tenantId,
      payload,
    );
    res.status(200).send(result);
  };

  deleteRoom = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    const result = await this.roomService.deleteRoom(
      req.params.id as string,
      tenantId,
    );
    res.status(200).send(result);
  };

  getRooms = async (req: Request, res: Response) => {
    const result = await this.roomService.getRooms(req.query as any);
    res.status(200).send(result);
  };
}
