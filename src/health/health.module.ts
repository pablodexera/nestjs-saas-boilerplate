import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [ConfigModule, FilesModule],
  controllers: [HealthController],
  providers: [HealthService, PrismaService, NotificationsService],
  exports: [HealthService],
})
export class HealthModule {}
