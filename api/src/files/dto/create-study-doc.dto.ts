import { OmitType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { FileKind } from '../../shared/lib/types/file-kind.enum';
import { CreateFileUploadDto } from './create-file-upload.dto';

export class CreateStudyDocDto extends OmitType(CreateFileUploadDto, ['fileKind']) {
  @IsOptional()
  @IsInt()
  year?: number;

  @IsString()
  subject: string;

  @IsOptional()
  @IsUUID()
  docSeries?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn([FileKind.StudyDoc])
  fileKind?: FileKind.StudyDoc;
}
