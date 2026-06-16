import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNewsCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
