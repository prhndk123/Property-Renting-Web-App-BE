import cors from "cors";
import express, { Express } from "express";
import cookieParser from "cookie-parser";
import "reflect-metadata";
import { PORT } from "./config/env.js";
import { corsOptions } from "./config/cors.js";
import { loggerHttp } from "./lib/logger-http.js";
import { prisma } from "./lib/prisma.js";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middlewares/error.middleware.js";
import { ValidationMiddleware } from "./middlewares/validation.middleware.js";
import { AuthMiddleware } from "./middlewares/auth.middleware.js";

// Modules
import { AuthService } from "./modules/auth/auth.service.js";
import { AuthController } from "./modules/auth/auth.controller.js";
import { AuthRouter } from "./modules/auth/auth.router.js";
import { MailService } from "./modules/mail/mail.service.js";
import { DashboardService } from "./modules/dashboard/dashboard.service.js";
import { DashboardController } from "./modules/dashboard/dashboard.controller.js";
import { DashboardRouter } from "./modules/dashboard/dashboard.router.js";
import { UserService } from "./modules/user/user.service.js";
import { UserController } from "./modules/user/user.controller.js";
import { UserRouter } from "./modules/user/user.router.js";
import { PropertyService } from "./modules/property/property.service.js";
import { PropertyController } from "./modules/property/property.controller.js";
import { PropertyRouter } from "./modules/property/property.router.js";
import { RoomService } from "./modules/room/room.service.js";
import { RoomController } from "./modules/room/room.controller.js";
import { RoomRouter } from "./modules/room/room.router.js";
import { AvailabilityService } from "./modules/availability/availability.service.js";
import { AvailabilityController } from "./modules/availability/availability.controller.js";
import { AvailabilityRouter } from "./modules/availability/availability.router.js";
import { ReservationService } from "./modules/reservation/reservation.service.js";
import { ReservationController } from "./modules/reservation/reservation.controller.js";
import { ReservationRouter } from "./modules/reservation/reservation.router.js";
import { ReviewService } from "./modules/review/review.service.js";
import { ReviewController } from "./modules/review/review.controller.js";
import { ReviewRouter } from "./modules/review/review.router.js";
import { CloudinaryService } from "./modules/cloudinary/cloudinary.service.js";
import { MediaController } from "./modules/media/media.controller.js";
import { MediaRouter } from "./modules/media/media.router.js";
import { XenditService } from "./modules/payment/xendit.service.js";
import { CronService } from "./modules/cron/cron.service.js";

export class App {
  app: Express;

  constructor() {
    this.app = express();
    this.configure();
  }

  private configure() {
    this.app.use(cors(corsOptions));
    this.app.use(loggerHttp);
    this.app.use(express.json());
    this.app.use(cookieParser());
    this.registerModules();
    this.errorMiddleware();
  }

  private registerModules() {
    // Shared Middlewares
    const authMiddleware = new AuthMiddleware();
    const validationMiddleware = new ValidationMiddleware();

    // Shared Services
    const mailService = new MailService();
    const cloudinaryService = new CloudinaryService();
    const xenditService = new XenditService();

    // Module Services
    const authService = new AuthService(prisma, mailService);
    const dashboardService = new DashboardService(prisma);
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

    // Controllers
    const authController = new AuthController(authService);
    const dashboardController = new DashboardController(dashboardService);
    const userController = new UserController(userService);
    const propertyController = new PropertyController(propertyService);
    const roomController = new RoomController(roomService);
    const availabilityController = new AvailabilityController(
      availabilityService,
    );
    const reservationController = new ReservationController(reservationService);
    const reviewController = new ReviewController(reviewService);
    const mediaController = new MediaController(cloudinaryService);

    // Routers
    const authRouter = new AuthRouter(
      authController,
      authMiddleware,
      validationMiddleware,
    );
    const dashboardRouter = new DashboardRouter(
      dashboardController,
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
    const mediaRouter = new MediaRouter(mediaController, authMiddleware);

    // Entry points
    this.app.use("/auth", authRouter.getRouter());
    this.app.use("/dashboard", dashboardRouter.getRouter());
    this.app.use("/users", userRouter.getRouter());
    this.app.use("/properties", propertyRouter.getRouter());
    this.app.use("/rooms", roomRouter.getRouter());
    this.app.use("/availability", availabilityRouter.getRouter());
    this.app.use("/reservations", reservationRouter.getRouter());
    this.app.use("/reviews", reviewRouter.getRouter());
    this.app.use("/media", mediaRouter.getRouter());

    // Cron
    const cronService = new CronService(prisma, mailService);
    cronService.start();
  }

  private errorMiddleware() {
    this.app.use(notFoundMiddleware);
    this.app.use(errorMiddleware);
  }

  public start() {
    this.app.listen(PORT, () => {
      console.log(`Server running on port: ${PORT}`);
    });
  }
}
