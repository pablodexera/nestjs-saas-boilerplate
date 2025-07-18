// src/common/enums/subscription-plan.enum.ts

/**
 * Enum representing all supported subscription plans for a workspace.
 * Update this list as new plans are added to the platform.
 *
 * Usage example:
 *   if (req.workspace.subscriptions?.[0]?.plan === SubscriptionPlan.FREE) { ... }
 *   if ([SubscriptionPlan.PRO, SubscriptionPlan.ENTERPRISE].includes(req.workspace.subscriptions?.[0]?.plan)) { ... }
 */
export enum SubscriptionPlan {
  FREE = 'free',
  PLUS = 'plus',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}
