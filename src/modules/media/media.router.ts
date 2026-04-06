import express, { Router } from "express";
import { MediaController } from "./media.controller.js";
import { uploader } from "../../middlewares/uploader.middleware.js";
import { AuthMiddleware } from "../../middlewares/auth.middleware.js";

export class MediaRouter {
  private router: Router;

  constructor(
    private mediaController: MediaController,
    private authMiddleware: AuthMiddleware,
  ) {
    this.router = express.Router();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.post(
      "/upload",
      this.authMiddleware.verifyToken(process.env.JWT_SECRET!),
      uploader.single("file"),
      this.mediaController.uploadFile,
    );
  };

  getRouter = () => this.router;
}
