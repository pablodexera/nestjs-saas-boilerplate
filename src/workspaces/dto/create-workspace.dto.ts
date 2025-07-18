// src/workspaces/dto/create-workspace.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, Matches } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'Danila Team' })
  @IsString()
  @Matches(/^[a-zA-Z0-9 .,'-]+$/, {
    message: 'Name must be alphanumeric and may include spaces and common punctuation',
  })
  name!: string;

  @ApiProperty({ example: 'danila-team' })
  @IsString()
  @IsNotEmpty({ message: 'Slug must not be empty' })
  @Matches(/^[a-zA-Z0-9-]+$/, { message: 'Slug must be alphanumeric and may include hyphens only' })
  slug!: string;

  @ApiProperty({ example: 'user_clerk_id', required: true })
  @IsString()
  @IsNotEmpty({ message: 'owner_id must not be empty' })
  owner_id!: string;

  @ApiProperty({
    example: { theme: 'light', custom: true },
    required: false,
    type: Object,
  })
  @IsOptional()
  settings_json?: Record<string, any>;
}
