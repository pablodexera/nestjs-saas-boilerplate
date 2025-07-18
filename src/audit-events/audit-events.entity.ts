import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

/**
 * Representation of an audit event returned by the API.
 */
export class AuditEventEntity {
  @ApiProperty({ example: 'audit_event_uuid' })
  id!: string;

  @ApiProperty({ example: 'user.created' })
  eventType!: string;

  @ApiProperty({ example: 'user_uuid', required: false })
  actorId?: string | null;

  @ApiProperty({ example: 'workspace_uuid', required: false })
  workspaceId?: string | null;

  @ApiProperty({ example: { foo: 'bar' }, required: false, type: Object })
  details?: Prisma.JsonValue | null;

  @ApiProperty({ example: '2025-07-06T21:00:00Z' })
  createdAt!: Date;
}
