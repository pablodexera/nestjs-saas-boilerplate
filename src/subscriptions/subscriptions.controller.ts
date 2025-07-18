import { Controller, Get, Patch, Body, Param, Req, Query, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';

import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionDto } from './dto/subscription.dto';
import { AdminOnly } from '../common/decorators/admin-only.decorator';
import { WorkspaceMember } from '../common/decorators/workspace-member.decorator';
import { SubscriptionPlan } from '../common/enums/subscription-plan.enum';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('workspace/:workspaceId')
  @WorkspaceMember()
  @ApiOperation({ summary: 'Get subscription for a workspace (Workspace member only)' })
  @ApiResponse({ status: 200, type: SubscriptionDto })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async getWorkspaceSubscription(
    @Param('workspaceId') workspaceId: string,
    @Req() _req: Request,
  ): Promise<SubscriptionDto> {
    const sub = await this.subscriptionsService.findByWorkspaceId(workspaceId);
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }

  @Patch('workspace/:workspaceId/upgrade')
  @AdminOnly()
  @ApiOperation({ summary: 'Upgrade workspace subscription (Admin only)' })
  @ApiResponse({ status: 200, type: SubscriptionDto })
  async upgradeSubscription(
    @Param('workspaceId') workspaceId: string,
    @Body()
    dto: {
      plan: SubscriptionPlan;
      billingPeriod: 'monthly' | 'annual';
      seats: number;
      stripeId?: string;
      trialEnd?: Date;
    },
    @Req() _req: Request,
  ): Promise<SubscriptionDto> {
    const upgraded = await this.subscriptionsService.upgradeSubscription(
      workspaceId,
      dto.plan,
      dto.billingPeriod,
      dto.seats,
      dto.stripeId,
      dto.trialEnd,
    );
    return upgraded;
  }

  @Patch('workspace/:workspaceId/status')
  @AdminOnly()
  @ApiOperation({ summary: 'Set subscription status (Admin only)' })
  @ApiResponse({ status: 200, type: SubscriptionDto })
  async setStatus(
    @Param('workspaceId') workspaceId: string,
    @Body('status') status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired',
    @Req() _req: Request,
  ): Promise<SubscriptionDto> {
    const updated = await this.subscriptionsService.setStatus(workspaceId, status);
    return updated;
  }

  @Patch('workspace/:workspaceId/record-limit')
  @AdminOnly()
  @ApiOperation({ summary: 'Update record limit for subscription (Admin only)' })
  @ApiResponse({ status: 200, type: SubscriptionDto })
  async updateRecordLimit(
    @Param('workspaceId') workspaceId: string,
    @Body('newLimit') newLimit: number,
    @Req() _req: Request,
  ): Promise<SubscriptionDto> {
    const updated = await this.subscriptionsService.updateRecordLimit(workspaceId, newLimit);
    return updated;
  }

  @Patch('workspace/:workspaceId/billing')
  @AdminOnly()
  async updateBillingPeriod(
    @Param('workspaceId') workspaceId: string,
    @Body('billing_period') billingPeriod: 'monthly' | 'yearly',
    @Req() _req: Request,
  ): Promise<SubscriptionDto> {
    // Find the current subscription
    const sub = await this.subscriptionsService.findByWorkspaceId(workspaceId);
    if (!sub) throw new NotFoundException('Subscription not found');
    // Map 'yearly' to 'annual' for compatibility
    const mappedBillingPeriod = billingPeriod === 'yearly' ? 'annual' : billingPeriod;
    // Use upgradeSubscription to update only the billing period, keeping other fields unchanged
    const updated = await this.subscriptionsService.upgradeSubscription(
      workspaceId,
      sub.plan as SubscriptionPlan,
      mappedBillingPeriod,
      sub.seats,
      sub.stripe_id ?? undefined,
      sub.trial_end ?? undefined,
    );
    return updated;
  }

  @Get('all')
  @AdminOnly()
  @ApiQuery({ name: 'plan', required: false, enum: SubscriptionPlan })
  @ApiQuery({ name: 'status', required: false })
  @ApiOperation({ summary: 'List all subscriptions (Admin only)' })
  @ApiResponse({ status: 200, type: [SubscriptionDto] })
  async getAll(
    @Query('plan') plan?: SubscriptionPlan,
    @Query('status') status?: string,
    @Req() _req?: Request,
  ): Promise<SubscriptionDto[]> {
    const filter: any = {};
    if (plan) filter.plan = plan;
    if (status) filter.status = status;
    return this.subscriptionsService.getAllSubscriptions(filter);
  }
}
