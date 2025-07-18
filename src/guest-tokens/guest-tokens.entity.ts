// src/guest-tokens/guest-tokens.entity.ts

import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class GuestTokenEntity {
  @ApiProperty({ example: 'opaque_or_jwt_token', description: 'Opaque or JWT guest token (PK)' })
  token!: string;

  @ApiProperty({
    example: 'workspace_uuid',
    required: false,
    description: 'Workspace scope (nullable)',
  })
  workspace_id?: string | null;

  @ApiProperty({ example: '2025-07-06T21:00:00Z' })
  issued_at!: Date;

  @ApiProperty({ example: '2025-07-07T21:00:00Z' })
  expires_at!: Date;

  @ApiProperty({
    example: { canView: true, canEdit: false },
    required: false,
    description: 'Permission scopes',
  })
  permissions?: Prisma.JsonValue | null;

  @ApiProperty({ example: 0, description: 'Number of times used' })
  usage_count!: number;

  @ApiProperty({ example: 5, required: false, description: 'Maximum allowed uses (nullable)' })
  max_usage?: number | null;
}
