import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntity } from './subscriptions.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { SubscriptionPlan } from '../common/enums/subscription-plan.enum';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
    private readonly logger: PinoLogger,
  ) {}

  async findByWorkspaceId(workspaceId: string): Promise<SubscriptionEntity | null> {
    const sub = await this.prisma.subscription.findUnique({
      where: { workspace_id: workspaceId },
    });
    if (sub) {
      this.logger.info({ workspaceId, plan: sub.plan }, 'Subscription fetched');
    }
    return sub;
  }

  async createDefaultSubscriptionForWorkspace(workspaceId: string): Promise<SubscriptionEntity> {
    const exists = await this.findByWorkspaceId(workspaceId);
    if (exists) {
      this.logger.warn(
        'Attempted to create default subscription for workspace with existing subscription: %o',
        { workspaceId },
      );
      throw new BadRequestException('Workspace already has a subscription');
    }
    const now = new Date();
    const sub = await this.prisma.subscription.create({
      data: {
        workspace_id: workspaceId,
        plan: SubscriptionPlan.FREE,
        billing_period: 'monthly',
        status: 'active',
        current_period_start: now,
        current_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        trial_end: null,
        seats: 1,
        record_limit: 1000,
        stripe_id: null,
      },
    });
    this.logger.info('Default free subscription created: %o', { workspaceId });
    return sub;
  }

  async createDefaultFreeSubscription(workspaceId: string): Promise<SubscriptionEntity> {
    return this.createDefaultSubscriptionForWorkspace(workspaceId);
  }

  async ensureDefaultFreeSubscription(workspaceId: string): Promise<SubscriptionEntity> {
    const existing = await this.findByWorkspaceId(workspaceId);
    if (existing) return existing;
    return this.createDefaultSubscriptionForWorkspace(workspaceId);
  }

  async upgradeSubscription(
    workspaceId: string,
    plan: SubscriptionPlan,
    billingPeriod: 'monthly' | 'annual',
    seats: number,
    stripeId?: string,
    trialEnd?: Date,
  ): Promise<SubscriptionEntity> {
    const sub = await this.findByWorkspaceId(workspaceId);
    if (!sub) {
      this.logger.warn('Upgrade failed - subscription not found: %o', { workspaceId });
      throw new NotFoundException('Subscription not found');
    }
    const now = new Date();
    const updated = await this.prisma.subscription.update({
      where: { workspace_id: workspaceId },
      data: {
        plan,
        billing_period: billingPeriod,
        seats,
        status: 'active',
        trial_end: trialEnd || null,
        stripe_id: stripeId ?? sub.stripe_id,
        current_period_start: now,
        current_period_end:
          billingPeriod === 'monthly'
            ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
            : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    this.logger.info('Subscription upgraded: %o', {
      workspaceId,
      plan,
      billingPeriod,
      seats,
      stripeId,
    });
    return updated;
  }

  async setStatus(
    workspaceId: string,
    status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired',
  ): Promise<SubscriptionEntity> {
    const sub = await this.findByWorkspaceId(workspaceId);
    if (!sub) {
      this.logger.warn('Set status failed - subscription not found: %o', { workspaceId, status });
      throw new NotFoundException('Subscription not found');
    }
    const updated = await this.prisma.subscription.update({
      where: { workspace_id: workspaceId },
      data: { status },
    });
    this.logger.info({ workspaceId, status }, 'Subscription status updated');
    return updated;
  }

  async updateRecordLimit(workspaceId: string, newLimit: number): Promise<SubscriptionEntity> {
    const sub = await this.findByWorkspaceId(workspaceId);
    if (!sub) {
      this.logger.warn('Update record limit failed - subscription not found: %o', {
        workspaceId,
        newLimit,
      });
      throw new NotFoundException('Subscription not found');
    }
    const updated = await this.prisma.subscription.update({
      where: { workspace_id: workspaceId },
      data: { record_limit: newLimit },
    });
    this.logger.info({ workspaceId, newLimit }, 'Subscription record limit updated');
    return updated;
  }

  async getAllSubscriptions(
    filter: Partial<{ plan: SubscriptionPlan; status: string }> = {},
  ): Promise<SubscriptionEntity[]> {
    const where: any = {};
    if (filter.plan) where.plan = filter.plan;
    if (filter.status) where.status = filter.status;
    const subs = await this.prisma.subscription.findMany({ where });
    this.logger.info('All subscriptions fetched: %o', { filter, count: subs.length });
    return subs;
  }
}
