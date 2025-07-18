// src/notifications/notifications.entity.ts

import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class NotificationEntity {
  @ApiProperty({ example: 'notification_uuid', description: 'Notification id (PK)' })
  id!: string;

  @ApiProperty({ example: 'user_uuid', description: 'Recipient user id' })
  user_id!: string;

  @ApiProperty({ example: 'subscription-expiring', description: 'Notification type' })
  type!: string;

  @ApiProperty({
    example: { expiryDate: '2025-08-01' },
    required: false,
    description: 'Notification payload',
  })
  payload?: Prisma.JsonValue | null;

  @ApiProperty({ example: 'email', description: 'Sent via channel' })
  sent_via?: string | null;

  @ApiProperty({ example: '2025-07-06T21:00:00Z', required: false })
  sent_at?: Date | null;

  @ApiProperty({ example: '2025-07-07T09:00:00Z', required: false })
  read_at?: Date | null;

  @ApiProperty({ example: '2025-07-07T09:00:00Z', required: false })
  dismissed_at?: Date | null;
}
