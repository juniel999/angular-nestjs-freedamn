import { IsString, IsOptional } from 'class-validator';

export class UpdateCommentDto {
  @IsString()
  @IsOptional()
  content?: string;
} 