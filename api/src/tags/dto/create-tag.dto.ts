import { Transform } from 'class-transformer';
import {
 IsNotEmpty, IsOptional, IsString, Length, Matches,
} from 'class-validator';

const opaqueHexColor = /^(?:[\da-f]{3}|[\da-f]{6})$/i;
const tagRegex = /^[\d:a-z-]+$/;

export class CreateTagDto {
  @Length(1, 50)
  @Matches(tagRegex)
  @IsString()
  name: string;

  @IsNotEmpty()
  @Matches(opaqueHexColor)
  @Transform(({ value }: { value: string }) => (value.startsWith('#') ? value.slice(1) : value))
  color: string;

  @IsOptional()
  @IsString()
  description?: string;
}
