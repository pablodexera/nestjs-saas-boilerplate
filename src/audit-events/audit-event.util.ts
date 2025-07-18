import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { AuditEventsService } from './audit-events.service';
import { AuditEventDto } from './dto/audit-event.dto';

/**
 * Utility for dual logging to Pino and the audit_events table.
 * Call this util from webhooks, services, or controllers to ensure all critical events are logged and persisted.
 */
@Injectable()
export class AuditEventUtil {
  constructor(
    private readonly auditEventsService: AuditEventsService,
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Log a business/audit event to both Pino and the database.
   * @param dto AuditEventDto with eventType, actorId, workspaceId, details
   */
  async logEvent(dto: AuditEventDto): Promise<void> {
    // 1. Pino structured log
    this.logger.info('Audit event: %o', {
      eventType: dto.eventType,
      actorId: dto.actorId,
      workspaceId: dto.workspaceId,
      details: dto.details,
    });

    // 2. DB event
    try {
      await this.auditEventsService.logEvent(dto);
    } catch (error) {
      const err = error as Error;
      // Log to Pino at error level if DB persist fails
      this.logger.error('Failed to persist audit event to DB: %o', {
        error: err.message,
        eventType: dto.eventType,
        actorId: dto.actorId,
        workspaceId: dto.workspaceId,
      });
      // Optionally: add fallback/error reporting/alerting here
    }
  }
}
