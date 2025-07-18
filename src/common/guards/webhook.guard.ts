import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { verifyWebhook } from '@clerk/backend/webhooks';
import { Request as ExpressRequest } from 'express';

@Injectable()
export class WebhookGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: ExpressRequest = context.switchToHttp().getRequest();
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      throw new UnauthorizedException('Webhook secret not configured');
    }

    const svixId = req.headers['svix-id'] as string | undefined;
    const svixTimestamp = req.headers['svix-timestamp'] as string | undefined;
    const svixSignature = req.headers['svix-signature'] as string | undefined;
    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new UnauthorizedException('Missing Svix webhook headers');
    }

    try {
      // Convert Express request to Web API Request for Clerk verification
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const request = new Request('http://localhost', {
        method: req.method,
        headers: {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        },
        body,
      });

      // Verify the webhook using Clerk's verifyWebhook function
      await verifyWebhook(request, { signingSecret: secret });
      return true;
    } catch (err) {
      const error = err as Error;
      throw new UnauthorizedException(`Invalid webhook signature: ${error.message}`);
    }
  }
}
