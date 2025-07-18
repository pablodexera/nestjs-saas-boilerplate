// src/workspaces/dto/workspace-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class WorkspaceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;

  @ApiProperty({ required: false })
  deleted_at?: Date | null;

  @ApiProperty({ required: false })
  owner_id?: string | null;

  @ApiProperty({ required: false, type: Object })
  settings_json?: Record<string, any> | null;

  @ApiProperty({ required: false })
  is_primary?: boolean;
}
