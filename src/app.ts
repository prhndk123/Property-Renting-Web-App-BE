import cors from "cors";
import express, { Express, Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import "reflect-metadata";
import * as dotenv from "dotenv";
import { prisma } from "./lib/prisma.js";

// Services
import { AuthService } from "./modules/auth/auth.service.js";
import { UserService } from "./modules/user/user.service.js";
import { PropertyService } from "./modules/property/property.service.js";
import { RoomService } from "./modules/room/room.service.js";
import { AvailabilityService } from "./modules/availability/availability.service.js";
import { ReservationService } from "./modules/reservation/reservation.service.js";
import { ReviewService } from "./modules/review/review.service.js";
import { DashboardService } from "./modules/dashboard/dashboard.service.js";
import { MailService } from "./modules/mail/mail.service.js";
import { CloudinaryService } from "./modules/cloudinary/cloudinary.service.js";
import { XenditService } from "./modules/payment/xendit.service.js";
import { CronService } from "./modules/cron/cron.service.js";

// Controllers
import { AuthController } from "./modules/auth/auth.controller.js";
import { UserController } from "./modules/user/user.controller.js";
import { PropertyController } from "./modules/property/property.controller.js";
import { RoomController } from "./modules/room/room.controller.js";
import { AvailabilityController } from "./modules/availability/availability.controller.js";
import { ReservationController } from "./modules/reservation/reservation.controller.js";
import { ReviewController } from "./modules/review/review.controller.js";
import { DashboardController } from "./modules/dashboard/dashboard.controller.js";
import { MediaController } from "./modules/media/media.controller.js";

// Routers
import { AuthRouter } from "./modules/auth/auth.router.js";
import { UserRouter } from "./modules/user/user.router.js";
import { PropertyRouter } from "./modules/property/property.router.js";
import { RoomRouter } from "./modules/room/room.router.js";
import { AvailabilityRouter } from "./modules/availability/availability.router.js";
import { ReservationRouter } from "./modules/reservation/reservation.router.js";
import { ReviewRouter } from "./modules/review/review.router.js";
import { DashboardRouter } from "./modules/dashboard/dashboard.router.js";
import { MediaRouter } from "./modules/media/media.router.js";
import { AuthMiddleware } from "./middlewares/auth.middleware.js";
import { ValidationMiddleware } from "./middlewares/validation.middleware.js";

// Middlewares

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class App {
  app: Express;

  constructor() {
    this.app = express();
    this.configure();
    this.registerModules();
    this.errorMiddleware();
  }

  private configure() {
    this.app.use(
      cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
      }),
    );

    this.app.use(express.json());

    this.app.use(
      "/uploads",
      express.static(path.join(__dirname, "../public/uploads")),
    );
  }

  private registerModules() {
    // ===== COMMON SERVICES =====
    const mailService = new MailService();
    const cloudinaryService = new CloudinaryService();
    const xenditService = new XenditService();

    // ===== CORE SERVICES =====
    const authService = new AuthService(prisma, mailService);
    const userService = new UserService(prisma, cloudinaryService, mailService);
    const propertyService = new PropertyService(prisma);
    const roomService = new RoomService(prisma);
    const availabilityService = new AvailabilityService(prisma);
    const reservationService = new ReservationService(
      prisma,
      availabilityService,
      xenditService,
      mailService,
    );
    const reviewService = new ReviewService(prisma);
    const dashboardService = new DashboardService(prisma);

    // ===== CRON =====
    const cronService = new CronService(prisma, mailService);
    cronService.start();

    // ===== CONTROLLERS =====
    const authController = new AuthController(authService);
    const userController = new UserController(userService);
    const propertyController = new PropertyController(propertyService);
    const roomController = new RoomController(roomService);
    const availabilityController = new AvailabilityController(
      availabilityService,
    );
    const reservationController = new ReservationController(reservationService);
    const reviewController = new ReviewController(reviewService);
    const dashboardController = new DashboardController(dashboardService);
    const mediaController = new MediaController(cloudinaryService);

    // ===== MIDDLEWARES =====
    const authMiddleware = new AuthMiddleware();
    const validationMiddleware = new ValidationMiddleware();

    // ===== ROUTERS =====
    const authRouter = new AuthRouter(
      authController,
      authMiddleware,
      validationMiddleware,
    );
    const userRouter = new UserRouter(
      userController,
      authMiddleware,
      validationMiddleware,
    );
    const propertyRouter = new PropertyRouter(
      propertyController,
      authMiddleware,
      validationMiddleware,
    );
    const roomRouter = new RoomRouter(
      roomController,
      authMiddleware,
      validationMiddleware,
    );
    const availabilityRouter = new AvailabilityRouter(
      availabilityController,
      authMiddleware,
      validationMiddleware,
    );
    const reservationRouter = new ReservationRouter(
      reservationController,
      authMiddleware,
      validationMiddleware,
    );
    const reviewRouter = new ReviewRouter(
      reviewController,
      authMiddleware,
      validationMiddleware,
    );
    const dashboardRouter = new DashboardRouter(
      dashboardController,
      authMiddleware,
      validationMiddleware,
    );
    const mediaRouter = new MediaRouter(mediaController, authMiddleware);

    // ===== ROUTE REGISTRATION =====
    this.app.use("/api/auth", authRouter.getRouter());
    this.app.use("/api/users", userRouter.getRouter());
    this.app.use("/api/properties", propertyRouter.getRouter());
    this.app.use("/api/rooms", roomRouter.getRouter());
    this.app.use("/api/availability", availabilityRouter.getRouter());
    this.app.use("/api/reservations", reservationRouter.getRouter());
    this.app.use("/api/reviews", reviewRouter.getRouter());
    this.app.use("/api/dashboard", dashboardRouter.getRouter());
    this.app.use("/api/media", mediaRouter.getRouter());
  }

  private errorMiddleware() {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({ message: "Not Found" });
    });

    // global error handler
    this.app.use(
      (err: any, req: Request, res: Response, next: NextFunction) => {
        console.error(err);

        res.status(err.status || 500).json({
          message: err.message || "Internal Server Error",
          errors: err.errors || null,
        });
      },
    );
  }

  public start() {
    const PORT = process.env.PORT || 8000;

    this.app.listen(PORT, () => {
      console.log(`🚀 Server running on port: ${PORT}`);
    });
  }
}
