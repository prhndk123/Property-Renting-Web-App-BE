import { CorsOptions } from "cors";

export const corsOptions: CorsOptions = {
  origin: [
    "http://localhost:5173",
    "https://rentivo.tmmin.online",
    process.env.BASE_FRONTEND_URL!,
    process.env.FRONTEND_URL!,
  ].filter(Boolean),
  credentials: true,
};
