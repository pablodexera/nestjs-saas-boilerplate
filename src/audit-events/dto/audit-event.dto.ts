// src/audit-events/dto/audit-event.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsDateString, Matches } from 'class-validator';

/**
 * Data transfer object for creating or returning audit events.
 */
export class AuditEventDto {
  @ApiProperty({ example: 'audit_event_uuid', required: false })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: 'user.created' })
  @IsString()
  @Matches(/^[a-zA-Z0-9.]+$/, {
    message: 'eventType must be alphanumeric and may include dots only',
  })
  eventType!: string;

  @ApiProperty({ example: 'user_clerk_id', required: false })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiProperty({ example: 'workspace_uuid', required: false })
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @ApiProperty({ example: { foo: 'bar' }, required: false, type: Object })
  @IsOptional()
  details?: Record<string, any>;

  @ApiProperty({ example: '2025-07-06T21:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  createdAt?: Date;
}
