import multer from "multer";
import path from "path";
import { Request } from "express";
import { ApiError } from "../utils/api-error.js";

const storage = multer.memoryStorage();

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowed = [".jpg", ".jpeg", ".png"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowed.includes(ext) && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        `Invalid file type. Allowed: ${allowed.join(", ")}`,
        400,
      ) as any,
      false,
    );
  }
};

export const uploader = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit for safety/performance
});
