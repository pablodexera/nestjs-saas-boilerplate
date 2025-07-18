// src/users/dto/user-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ required: false })
  full_name?: string;

  @ApiProperty({ required: false })
  avatar_url?: string;

  @ApiProperty()
  is_global_admin!: boolean;

  @ApiProperty({ required: false })
  primary_workspace_id?: string;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;

  @ApiProperty({ required: false })
  last_login_at?: Date;

  @ApiProperty({ required: false })
  social_provider?: string;

  @ApiProperty({ required: false })
  country?: string;

  @ApiProperty()
  is_disabled!: boolean;
}
