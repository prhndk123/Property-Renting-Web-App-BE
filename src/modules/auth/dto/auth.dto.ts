import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsUrl,
  ValidateIf,
} from "class-validator";
import { UserRole } from "@prisma/client";

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role!: UserRole;

  @ValidateIf((o) => o.role === "TENANT")
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @ValidateIf((o) => o.role === "TENANT")
  @IsString()
  @IsNotEmpty()
  businessName?: string;
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

export class ResendVerificationDto {
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

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  accessToken!: string;
}

export class OnboardingDto {
  @IsEnum(UserRole)
  @IsNotEmpty()
  role!: UserRole;

  @ValidateIf((o) => o.role === "TENANT")
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ValidateIf((o) => o.role === "TENANT")
  @IsString()
  @IsNotEmpty()
  businessName!: string;
}
