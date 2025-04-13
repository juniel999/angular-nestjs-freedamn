import { IsString, IsEmail, IsOptional, IsObject, ValidateNested, IsNotEmpty, IsIn, IsDate, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class SocialLinksDto {
  @IsString()
  @IsOptional()
  facebook?: string;

  @IsString()
  @IsOptional()
  linkedin?: string;

  @IsString()
  @IsOptional()
  github?: string;

  @IsString()
  @IsOptional()
  twitter?: string;

  @IsString()
  @IsOptional()
  instagram?: string;

  @IsString()
  @IsOptional()
  youtube?: string;

  @IsString()
  @IsOptional()
  tiktok?: string;

  @IsString()
  @IsOptional()
  website?: string;
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({message: 'Username is required'})
  username: string;

  @IsEmail({},{message: 'Invalid email address'})
  @IsNotEmpty({message: 'Email is required'})
  email: string;

  @IsString()
  @IsNotEmpty({message: 'Password is required'})
  password: string;

  @IsString()
  @IsNotEmpty({message: 'First name is required'})
  firstName: string;

  @IsString()
  @IsNotEmpty({message: 'Last name is required'})
  lastName: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  coverphoto?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthdate?: Date;

  @IsOptional()
  @IsString()
  @IsIn(['He/Him', 'She/Her', 'They/Them'])
  pronouns?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socials?: SocialLinksDto;
} 