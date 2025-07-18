// src/subscriptions/dto/subscription.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class SubscriptionDto {
  @ApiProperty({ example: 'subscription_uuid' })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 'workspace_uuid' })
  @IsUUID()
  workspace_id!: string;

  @ApiProperty({ example: 'free', enum: ['free', 'plus', 'pro', 'enterprise'] })
  @IsString()
  plan!: string;

  @ApiProperty({ example: 'monthly', enum: ['monthly', 'annual'] })
  @IsString()
  billing_period!: string;

  @ApiProperty({ example: 'active', enum: ['active', 'trialing', 'past_due', 'canceled'] })
  @IsString()
  status!: string;

  @ApiProperty({ example: '2025-07-01T00:00:00Z' })
  @IsDateString()
  current_period_start!: Date;

  @ApiProperty({ example: '2025-08-01T00:00:00Z' })
  @IsDateString()
  current_period_end!: Date;

  @ApiProperty({ example: '2025-07-15T00:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  trial_end?: Date | null;

  @ApiProperty({ example: 1 })
  @IsNumber()
  seats!: number;

  @ApiProperty({ example: 10000, required: false })
  @IsOptional()
  @IsNumber()
  record_limit?: number | null;

  @ApiProperty({ example: 'stripe_subscription_id', required: false })
  @IsOptional()
  @IsString()
  stripe_id?: string | null;
}
