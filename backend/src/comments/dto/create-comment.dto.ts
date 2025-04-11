import { IsString, IsNotEmpty, IsMongoId, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsMongoId()
  @IsNotEmpty()
  blogId: string;

  @IsMongoId()
  @IsOptional()
  parentId?: string;
} 