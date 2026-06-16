import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNewsPostDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  content!: string;
}
