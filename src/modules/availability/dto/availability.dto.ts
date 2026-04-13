import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

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

export class AvailabilityItemDto {
  @IsNotEmpty()
  @IsDateString()
  date!: string;

  @IsNotEmpty()
  @IsBoolean()
  isAvailable!: boolean;
}

export class BulkSetAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityItemDto)
  items!: AvailabilityItemDto[];
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
  @IsString()
  priceType!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  value!: number;
}

export class UpdatePeakRateDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  priceType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;
}
