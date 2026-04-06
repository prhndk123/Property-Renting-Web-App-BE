import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsUrl,
} from "class-validator";
import { UserRole } from "../../generated/prisma/client/index.js";

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role!: UserRole;

  @IsOptional()
  @IsUrl()
  profilePicture?: string;
}

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string;
}
