import { Injectable, BadRequestException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { PrismaService } from '../prisma/prisma.service';
import { AuditEventDto } from './dto/audit-event.dto';

interface AuditQuery {
  eventType?: string;
  actorId?: string;
  workspaceId?: string;
}

@Injectable()
export class AuditEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Create a new audit event record.
   */
  async create(dto: AuditEventDto): Promise<AuditEventDto> {
    if (!dto.eventType) throw new BadRequestException('Event type is required');
    // If actorId is required, uncomment the next line:
    // if (!dto.actorId) throw new BadRequestException('Actor ID is required');
    try {
      const created = await this.prisma.auditEvent.create({
        data: {
          event_type: dto.eventType,
          actor_id: dto.actorId,
          workspace_id: dto.workspaceId,
          details: dto.details,
        },
      });
      this.logger.info('Audit event created: %o', {
        eventType: dto.eventType,
        actorId: dto.actorId,
      });
      return {
        id: created.id,
        eventType: created.event_type,
        actorId: created.actor_id ?? undefined,
        workspaceId: created.workspace_id ?? undefined,
        details: (created.details ?? undefined) as Record<string, any> | undefined,
        createdAt: created.created_at,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error('Failed to create audit event: %o', { error: err.message });
      throw error;
    }
  }

  /**
   * Public alias for create to expose clearer intent when logging events.
   */
  async logEvent(dto: AuditEventDto): Promise<AuditEventDto> {
    return this.create(dto);
  }

  /** Fetch all audit events */
  async findAll(): Promise<AuditEventDto[]> {
    const records = await this.prisma.auditEvent.findMany();
    this.logger.info('Fetched all audit events', { count: records.length });
    return records.map((r) => ({
      id: r.id,
      eventType: r.event_type,
      actorId: r.actor_id ?? undefined,
      workspaceId: r.workspace_id ?? undefined,
      details: (r.details ?? undefined) as Record<string, any> | undefined,
      createdAt: r.created_at,
    }));
  }

  /** Fetch events by actor */
  async findByActor(actorId: string): Promise<AuditEventDto[]> {
    const records = await this.prisma.auditEvent.findMany({ where: { actor_id: actorId } });
    this.logger.info('Fetched audit events by actor', { actorId, count: records.length });
    return records.map((r) => ({
      id: r.id,
      eventType: r.event_type,
      actorId: r.actor_id ?? undefined,
      workspaceId: r.workspace_id ?? undefined,
      details: (r.details ?? undefined) as Record<string, any> | undefined,
      createdAt: r.created_at,
    }));
  }

  /** Fetch events by workspace */
  async findByWorkspace(workspaceId: string): Promise<AuditEventDto[]> {
    const records = await this.prisma.auditEvent.findMany({ where: { workspace_id: workspaceId } });
    this.logger.info('Fetched audit events by workspace', { workspaceId, count: records.length });
    return records.map((r) => ({
      id: r.id,
      eventType: r.event_type,
      actorId: r.actor_id ?? undefined,
      workspaceId: r.workspace_id ?? undefined,
      details: (r.details ?? undefined) as Record<string, any> | undefined,
      createdAt: r.created_at,
    }));
  }

  /** Query with optional filters */
  async query(filters: AuditQuery): Promise<AuditEventDto[]> {
    const where: any = {};
    if (filters.eventType) where.event_type = filters.eventType;
    if (filters.actorId) where.actor_id = filters.actorId;
    if (filters.workspaceId) where.workspace_id = filters.workspaceId;
    const records = await this.prisma.auditEvent.findMany({ where });
    this.logger.info('Queried audit events', { filters, count: records.length });
    return records.map((r) => ({
      id: r.id,
      eventType: r.event_type,
      actorId: r.actor_id ?? undefined,
      workspaceId: r.workspace_id ?? undefined,
      details: (r.details ?? undefined) as Record<string, any> | undefined,
      createdAt: r.created_at,
    }));
  }
}
