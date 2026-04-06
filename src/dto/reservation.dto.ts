import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";
import { Transform } from "class-transformer";
import { ReservationStatus } from "../../generated/prisma/client/index.js";

export class CreateReservationDto {
  @IsNotEmpty()
  @IsUUID()
  propertyId!: string;

  @IsNotEmpty()
  @IsUUID()
  roomId!: string;

  @IsNotEmpty()
  @IsDateString()
  checkinDate!: string;

  @IsNotEmpty()
  @IsDateString()
  checkoutDate!: string;

  @IsOptional()
  @IsEnum(["MANUAL_TRANSFER", "PAYMENT_GATEWAY"])
  paymentMethod?: "MANUAL_TRANSFER" | "PAYMENT_GATEWAY" = "MANUAL_TRANSFER";
}

export class GetReservationsQueryDto {
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  take: number = 10;

  @IsOptional()
  @IsString()
  sortBy: string = "createdAt";

  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder: "asc" | "desc" = "desc";
}

export class UpdateReservationStatusDto {
  @IsNotEmpty()
  @IsEnum(ReservationStatus)
  status!: ReservationStatus;
}
