// src/users/users.entity.ts

import { ApiProperty } from '@nestjs/swagger';

export class UserEntity {
  @ApiProperty({ example: 'clerk_user_uuid', description: 'Clerk user id (sync, PK)' })
  id!: string;

  @ApiProperty({ example: 'john@example.com', description: 'User email (from Clerk)' })
  email!: string;

  @ApiProperty({ example: 'John Doe', required: false })
  full_name?: string | null;

  @ApiProperty({ example: 'https://example.com/avatar.png', required: false })
  avatar_url?: string | null;

  @ApiProperty({ example: false })
  is_global_admin!: boolean;

  @ApiProperty({ example: 'workspace_uuid', required: false })
  primary_workspace_id?: string | null;

  @ApiProperty({ example: '2025-07-06T21:00:00Z' })
  created_at!: Date;

  @ApiProperty({ example: '2025-07-06T21:00:00Z' })
  updated_at!: Date;

  @ApiProperty({ example: '2025-07-06T21:00:00Z', required: false })
  last_login_at?: Date | null;

  @ApiProperty({ example: 'google', required: false })
  social_provider?: string | null;

  @ApiProperty({ example: 'NL', required: false })
  country?: string | null;

  @ApiProperty({ example: false })
  is_disabled!: boolean;
}
