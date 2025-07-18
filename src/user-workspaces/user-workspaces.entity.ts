// src/user-workspaces/user-workspaces.entity.ts

import { ApiProperty } from '@nestjs/swagger';

export class UserWorkspaceEntity {
  @ApiProperty({ example: 'user_uuid', description: 'User id' })
  user_id!: string;

  @ApiProperty({ example: 'workspace_uuid', description: 'Workspace id' })
  workspace_id!: string;

  @ApiProperty({
    example: 'inviter_user_uuid',
    required: false,
    description: 'Who invited (optional)',
  })
  invited_by?: string | null;

  @ApiProperty({ example: '2025-07-06T21:00:00Z', description: 'Joined timestamp' })
  joined_at!: Date;

  @ApiProperty({ example: 'active', description: "'active', 'pending', 'removed'" })
  status!: string;

  @ApiProperty({ example: 'MEMBER', enum: ['OWNER', 'MEMBER', 'ADMIN'] })
  role!: 'OWNER' | 'MEMBER' | 'ADMIN';
}
