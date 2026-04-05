import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";
import { Transform } from "class-transformer";

export class CreateRoomDto {
  @IsNotEmpty()
  @IsUUID()
  propertyId!: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  capacity!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  basePrice!: number;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;
}

export class GetRoomsQueryDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string;

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
}
