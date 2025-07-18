import { Module } from '@nestjs/common';

import { UserWorkspacesService } from './user-workspaces.service';
import { UserWorkspacesController } from './user-workspaces.controller';
import { UsersModule } from '../users/users.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { WorkspaceAdminGuard } from '../common/guards/workspace-admin.guard';

@Module({
  imports: [UsersModule, WorkspacesModule, NotificationsModule],
  controllers: [UserWorkspacesController],
  providers: [UserWorkspacesService, WorkspaceGuard, WorkspaceAdminGuard],
  exports: [UserWorkspacesService],
})
export class UserWorkspacesModule {}
