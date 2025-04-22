import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SocialLinksDto } from './update-profile.dto';

export class UpdateSocialsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socials: SocialLinksDto;
}