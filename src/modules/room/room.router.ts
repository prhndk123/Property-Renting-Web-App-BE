import express, { Router } from "express";
import { RoomController } from "./room.controller.js";
import { AuthMiddleware } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../types/user-role.js";
import { ValidationMiddleware } from "../../middlewares/validation.middleware.js";
import {
  CreateRoomDto,
  GetRoomsQueryDto,
  UpdateRoomDto,
} from "../../dto/room.dto.js";

export class RoomRouter {
  private router: Router;
  constructor(
    private roomController: RoomController,
    private authMiddleware: AuthMiddleware,
    private validationMiddleware: ValidationMiddleware,
  ) {
    this.router = express.Router();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.get(
      "/",
      this.validationMiddleware.validateQuery(GetRoomsQueryDto),
      this.roomController.getRooms,
    );
    this.router.get("/:id", this.roomController.getRoomById);

    this.router.use(this.authMiddleware.verifyToken(process.env.JWT_SECRET!));
    this.router.use(this.authMiddleware.verifyRole([UserRole.TENANT]));

    this.router.post(
      "/",
      this.validationMiddleware.validateBody(CreateRoomDto),
      this.roomController.createRoom,
    );
    this.router.patch(
      "/:id",
      this.validationMiddleware.validateBody(UpdateRoomDto),
      this.roomController.updateRoom,
    );
    this.router.delete("/:id", this.roomController.deleteRoom);
  };

  getRouter = () => this.router;
}
