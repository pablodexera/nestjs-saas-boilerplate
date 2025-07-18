import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { AuditEventsService } from './audit-events.service';
import { AuditEventsController } from './audit-events.controller';
import { AuditEventUtil } from './audit-event.util';
import { UsersModule } from '../users/users.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [LoggerModule.forRoot(), UsersModule, WorkspacesModule],
  controllers: [AuditEventsController],
  providers: [AuditEventsService, AuditEventUtil],
  exports: [AuditEventsService, AuditEventUtil],
})
export class AuditEventsModule {}
