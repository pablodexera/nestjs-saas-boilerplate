// src/users/users.module.ts

import { Module, forwardRef } from '@nestjs/common';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [forwardRef(() => WorkspacesModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
