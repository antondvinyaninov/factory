import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateConversationDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  participantIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}
