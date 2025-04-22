import { IsArray, IsString } from 'class-validator';

export class UpdateLikedTagsDto {
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}