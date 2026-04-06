import { Request, Response } from "express";
import { RoomService } from "./room.service.js";
import { AuthRequest } from "../../middlewares/auth.middleware.js";

export class RoomController {
  constructor(private roomService: RoomService) {}

  createRoom = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    const result = await this.roomService.createRoom(tenantId, req.body);
    res.status(201).send(result);
  };

  getRoomById = async (req: Request, res: Response) => {
    const result = await this.roomService.getRoomById(req.params.id as string);
    res.status(200).send(result);
  };

  updateRoom = async (req: Request, res: Response) => {
    const tenantId = (req as AuthRequest).user?.id!;
    const result = await this.roomService.updateRoom(
      req.params.id as string,
      tenantId,
      req.body,
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
