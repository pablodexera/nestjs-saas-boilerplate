import { Injectable } from '@nestjs/common';
import { Request } from 'express';

interface PocWorkspace {
  id: string;
  subscriptions: any[];
}

@Injectable()
export class GuestOrMemberPocService {
  async getAccessInfo(req: Request, workspaceId: string) {
    const isGuest = req.user?.isGuest;
    // Type guard for workspace
    function isPocWorkspace(obj: any): obj is PocWorkspace {
      return obj && typeof obj.id === 'string' && Array.isArray(obj.subscriptions);
    }
    const workspace: PocWorkspace = isPocWorkspace(req.workspace)
      ? req.workspace
      : { id: workspaceId, subscriptions: [] };
    // Use a mock subscription if none exist
    const subscription =
      workspace.subscriptions.length > 0
        ? workspace.subscriptions[0]
        : { id: 'sub_mock', type: 'trial', status: 'active' };

    if (isGuest) {
      return {
        type: 'guest',
        guest_id: req.user?.guestId || req.user?.id,
        workspace_id: workspace.id,
        subscription_id: subscription.id,
        subscription_type: subscription.type,
        subscription_status: subscription.status,
        permissions: req.user?.permissions || {},
      };
    } else {
      return {
        type: 'user',
        user_id: req.user?.id,
        email: req.user?.email,
        is_global_admin: req.user?.is_global_admin,
        workspace_id: workspace.id,
        subscription_id: subscription.id,
        subscription_type: subscription.type,
        subscription_status: subscription.status,
      };
    }
  }
}
