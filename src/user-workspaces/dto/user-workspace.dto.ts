// src/user-workspaces/dto/user-workspace.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional } from 'class-validator';

import { WorkspaceRole } from '../../common/enums/workspace-role.enum';

export class UserWorkspaceDto {
  @ApiProperty({ example: 'user_clerk_id' })
  @IsString()
  user_id!: string;

  @ApiProperty({ example: 'workspace_uuid' })
  @IsUUID()
  workspace_id!: string;

  @ApiProperty({ example: 'inviter_user_clerk_id', required: false })
  @IsOptional()
  @IsString()
  invited_by?: string;

  @ApiProperty({ example: 'active', required: false, enum: ['active', 'pending', 'removed'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ example: WorkspaceRole.MEMBER, enum: WorkspaceRole, required: false })
  @IsOptional()
  @IsString()
  role?: WorkspaceRole;
}
