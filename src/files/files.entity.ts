// src/files/files.entity.ts

import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class FileEntity {
  @ApiProperty({ example: 'file_uuid', description: 'File id (PK)' })
  id!: string;

  @ApiProperty({ example: 'user_uuid', description: 'Uploader' })
  user_id!: string;

  @ApiProperty({ example: 'workspace_uuid', description: 'Workspace context' })
  workspace_id!: string;

  @ApiProperty({ example: 'invoice.pdf', description: 'Original file name' })
  file_name!: string;

  @ApiProperty({
    example: 'myapp/files/workspace_uuid/invoice.pdf',
    description: 'Storage location',
  })
  file_path!: string;

  @ApiProperty({ example: 'https://bucket.s3.amazonaws.com/invoice.pdf', required: false })
  url?: string | null;

  @ApiProperty({ example: 'application/pdf', required: false })
  mime_type?: string | null;

  @ApiProperty({ example: 204800, required: false })
  size_bytes?: number | null;

  @ApiProperty({ example: '2025-07-06T21:00:00Z' })
  uploaded_at!: Date;

  @ApiProperty({ example: { source: 'api' }, required: false, description: 'Extra metadata' })
  metadata?: Prisma.JsonValue | null;
}
