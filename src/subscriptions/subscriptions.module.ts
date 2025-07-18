import { Module, forwardRef } from '@nestjs/common';

import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => WorkspacesModule), forwardRef(() => UsersModule)],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
