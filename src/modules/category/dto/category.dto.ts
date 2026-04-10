import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { Transform } from "class-transformer";

export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name!: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;
}

export class GetCategoriesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  take: number = 50;
}
