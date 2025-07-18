import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [LoggerModule.forRoot()],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
