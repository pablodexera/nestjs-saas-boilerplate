import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FilesService } from '../files/files.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly filesService: FilesService,
    private readonly logger: PinoLogger,
  ) {}

  async check(): Promise<Record<string, any>> {
    const result: Record<string, any> = {
      db: false,
      email: false,
      storage: false,
      status: 'unknown',
      timestamp: new Date().toISOString(),
    };

    // DB check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      result.db = true;
    } catch (err) {
      const error = err as Error;
      this.logger.error('Database check failed: %o', { error: error.message });
    }

    // Email check
    try {
      await this.notifications.ping();
      result.email = true;
    } catch (err) {
      const error = err as Error;
      this.logger.error('Notification email check failed: %o', { error: error.message });
    }

    // S3/Storage check
    try {
      await this.filesService.ping();
      result.storage = true;
    } catch (err) {
      const error = err as Error;
      this.logger.error('Storage check failed: %o', { error: error.message });
    }

    result.status = result.db && result.email && result.storage ? 'ok' : 'fail';
    this.logger.info('Health check result', result);
    return result;
  }
}
