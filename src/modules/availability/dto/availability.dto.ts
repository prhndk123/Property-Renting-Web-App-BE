import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from "class-validator";
import { PriceType } from "@prisma/client";

export class SetAvailabilityDto {
  @IsNotEmpty()
  @IsUUID()
  roomId!: string;

  @IsNotEmpty()
  @IsDateString()
  date!: string;

  @IsNotEmpty()
  @IsBoolean()
  isAvailable!: boolean;
}

export class SetPeakRateDto {
  @IsNotEmpty()
  @IsUUID()
  roomId!: string;

  @IsNotEmpty()
  @IsDateString()
  startDate!: string;

  @IsNotEmpty()
  @IsDateString()
  endDate!: string;

  @IsNotEmpty()
  @IsEnum(PriceType)
  priceType!: PriceType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  value!: number;
}
