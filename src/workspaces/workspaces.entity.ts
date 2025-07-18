// src/workspaces/workspaces.entity.ts

import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class WorkspaceEntity {
  @ApiProperty({ example: 'workspace_uuid', description: 'Workspace/tenant id (PK)' })
  id!: string;

  @ApiProperty({ example: 'Danila Team', description: 'Workspace/team name' })
  name!: string;

  @ApiProperty({ example: 'danila-team', description: 'URL-friendly identifier (slug)' })
  slug!: string;

  @ApiProperty({ example: '2025-07-06T21:00:00Z' })
  created_at!: Date;

  @ApiProperty({ example: '2025-07-06T21:00:00Z' })
  updated_at!: Date;

  @ApiProperty({ example: '2025-07-06T21:00:00Z', required: false })
  deleted_at?: Date | null;

  @ApiProperty({ example: 'user_uuid', required: false, description: 'Owner user id' })
  owner_id?: string | null;

  @ApiProperty({
    example: { theme: 'light', custom: true },
    required: false,
    description: 'Workspace settings (arbitrary JSON)',
    type: Object,
  })
  settings_json?: Prisma.JsonValue | null;
}
