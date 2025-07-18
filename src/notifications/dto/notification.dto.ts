// src/notifications/dto/notification.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsDateString, IsEmail, Matches } from 'class-validator';

export class NotificationDto {
  @ApiProperty({ example: 'notification_uuid' })
  @IsUUID()
  @IsOptional()
  id!: string;

  @ApiProperty({ example: 'user_uuid' })
  @IsString()
  user_id!: string;

  @ApiProperty({ example: 'subscription_expiring' })
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Type must be alphanumeric and may include underscores or dashes only',
  })
  type!: string;

  @ApiProperty({ example: { expiryDate: '2025-08-01' }, required: false, type: Object })
  @IsOptional()
  payload?: Record<string, any>;

  @ApiProperty({ example: 'email' })
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'sent_via must be alphanumeric and may include underscores or dashes only',
  })
  sent_via!: string;

  @ApiProperty({ example: 'user@email.com', required: false })
  @IsOptional()
  @IsEmail()
  toEmail?: string; // for API send (admin), not persisted in DB

  @ApiProperty({ example: '2025-07-06T21:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  sent_at?: Date;

  @ApiProperty({ example: '2025-07-07T09:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  read_at?: Date;

  @ApiProperty({ example: '2025-07-08T09:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  dismissed_at?: Date;
}
