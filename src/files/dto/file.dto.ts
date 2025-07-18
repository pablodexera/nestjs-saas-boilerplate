// src/files/dto/file.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class FileDto {
  @ApiProperty({ example: 'file_uuid' })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 'user_clerk_id' })
  @IsString()
  user_id!: string;

  @ApiProperty({ example: 'workspace_uuid' })
  @IsUUID()
  workspace_id!: string;

  @ApiProperty({ example: 'invoice.pdf' })
  @IsString()
  file_name!: string;

  @ApiProperty({ example: 'myapp/files/workspace_uuid/invoice.pdf' })
  @IsString()
  file_path!: string;

  @ApiProperty({ example: 'https://bucket.s3.amazonaws.com/invoice.pdf', required: false })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({ example: 'application/pdf', required: false })
  @IsOptional()
  @IsString()
  mime_type?: string;

  @ApiProperty({ example: 204800, required: false })
  @IsOptional()
  @IsNumber()
  size_bytes?: number;

  @ApiProperty({ example: '2025-07-06T21:00:00Z' })
  @IsDateString()
  uploaded_at!: Date;

  @ApiProperty({ example: { source: 'api' }, required: false, type: Object })
  @IsOptional()
  metadata?: Record<string, any>;
}
