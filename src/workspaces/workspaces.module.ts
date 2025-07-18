// src/workspaces/workspaces.module.ts

import { Module, forwardRef } from '@nestjs/common';

import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { UsersModule } from '../users/users.module';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { WorkspaceAdminGuard } from '../common/guards/workspace-admin.guard';

@Module({
  imports: [forwardRef(() => UsersModule)],
  providers: [WorkspacesService, WorkspaceGuard, WorkspaceAdminGuard],
  controllers: [WorkspacesController],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
