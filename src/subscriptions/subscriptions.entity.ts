// src/subscriptions/subscriptions.entity.ts

import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionEntity {
  @ApiProperty({ example: 'subscription_uuid', description: 'Subscription id (PK)' })
  id!: string;

  @ApiProperty({ example: 'workspace_uuid', description: 'Workspace id' })
  workspace_id!: string;

  @ApiProperty({ example: 'free', description: "Plan: 'free', 'plus', 'pro', 'enterprise'" })
  plan!: string;

  @ApiProperty({ example: 'monthly', description: "'monthly', 'annual'" })
  billing_period!: string;

  @ApiProperty({ example: 'active', description: "'active', 'trialing', 'past_due', etc." })
  status!: string;

  @ApiProperty({ example: '2025-07-01T00:00:00Z' })
  current_period_start!: Date;

  @ApiProperty({ example: '2025-08-01T00:00:00Z' })
  current_period_end!: Date;

  @ApiProperty({ example: '2025-07-15T00:00:00Z', required: false })
  trial_end?: Date | null;

  @ApiProperty({ example: 1 })
  seats!: number;

  @ApiProperty({ example: 10000, required: false })
  record_limit?: number | null;

  @ApiProperty({ example: 'stripe_subscription_id', required: false })
  stripe_id?: string | null;

  @ApiProperty({ example: '2025-07-01T00:00:00Z' })
  created_at!: Date;

  @ApiProperty({ example: '2025-07-01T00:00:00Z' })
  updated_at!: Date;
}
