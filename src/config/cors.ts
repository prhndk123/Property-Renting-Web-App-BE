import { CorsOptions } from "cors";

export const corsOptions: CorsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:8000",
    "http://localhost:3000",
    "https://rentivo.tmmin.online",
    process.env.BASE_FRONTEND_URL!,
    process.env.FRONTEND_URL!,
  ].filter(Boolean),
  credentials: true,
};
