import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { Resend } from 'resend';
import { isEmail } from 'class-validator';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  private readonly resend: Resend | null;
  private readonly emailTemplatesDir = path.join(__dirname, 'email-templates');
  private readonly templateCache: Map<string, Handlebars.TemplateDelegate> = new Map();
  private readonly enableEmail: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    const enableEmailConfig = this.configService.get('ENABLE_EMAIL');
    this.enableEmail = enableEmailConfig === true || enableEmailConfig === 'true';
    this.resend = this.enableEmail
      ? new Resend(this.configService.get<string>('RESEND_API_KEY'))
      : null;
  }

  async ping(): Promise<{ status: string }> {
    // Placeholder: always return fine; replace with real health logic later
    return { status: 'fine' };
  }

  async sendEmail(to: string, templateName: string, data: Record<string, any>): Promise<void> {
    if (!isEmail(to)) {
      this.logger.warn('sendEmail: Invalid email address: %o', { to, templateName });
      throw new Error('Invalid email address');
    }
    const compiled = this.getCompiledTemplate(templateName);
    const html = compiled(data);

    if (this.enableEmail !== true) {
      this.logger.info('[EMAIL-DEV-LOG]: %o', { to, template: templateName, data });
      this.logger.debug('Email HTML: %s', html);
    } else {
      try {
        const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL');
        if (!fromEmail) {
          throw new Error('RESEND_FROM_EMAIL not configured');
        }
        await this.resend!.emails.send({
          from: fromEmail,
          to,
          subject: this.getSubjectForTemplate(templateName, data),
          html,
        });
        this.logger.info('[EMAIL-SENT]: %o', { to, template: templateName });
      } catch (error) {
        const err = error as Error;
        this.logger.error('RESEND send failed: %o', { error: err.message, to, templateName });
        throw err;
      }
    }

    // Always persist notification in DB
    await this.prisma.notification.create({
      data: {
        user_id: data.userId || null,
        type: templateName,
        payload: data,
        sent_via: 'email',
        sent_at: new Date(),
      },
    });
    this.logger.info('Notification persisted: %o', { user: data.userId, template: templateName });
  }

  private getCompiledTemplate(templateName: string): Handlebars.TemplateDelegate {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }
    const templatePath = path.join(this.emailTemplatesDir, `${templateName}.hbs`);
    if (!fs.existsSync(templatePath)) {
      this.logger.error('Missing template: %s', templatePath);
      throw new Error(`Email template not found: ${templateName}`);
    }
    const templateString = fs.readFileSync(templatePath, 'utf-8');
    const compiled = Handlebars.compile(templateString);
    this.templateCache.set(templateName, compiled);
    return compiled;
  }

  // Optional: Customize subject per template (for UX, demo here)
  private getSubjectForTemplate(templateName: string, data: Record<string, any>): string {
    switch (templateName) {
      case 'welcome':
        return `Welcome, ${data.fullName || ''}!`;
      case 'subscription-expiring':
        return `Your ${data.planName || ''} Subscription Is Expiring Soon`;
      case 'workspace-invite':
        return `${data.inviterName || 'Someone'} invited you to join ${data.workspaceName || 'a workspace'}`;
      default:
        return 'Notification from Our App';
    }
  }

  async findAll(): Promise<NotificationDto[]> {
    const records = await this.prisma.notification.findMany({
      orderBy: { sent_at: 'desc' },
    });
    this.logger.info('Fetched all notifications', { count: records.length });
    return records.map((n: any) => this.toDto(n));
  }

  async sendNotification(dto: NotificationDto): Promise<NotificationDto> {
    // 1. Send email if needed
    if (dto.sent_via === 'email' && dto.toEmail) {
      await this.sendEmail(dto.toEmail, dto.type, {
        ...dto.payload,
        userId: dto.user_id,
      });
    }
    // 2. Always create the notification in the DB
    const created = await this.prisma.notification.create({
      data: {
        user_id: dto.user_id,
        type: dto.type,
        payload: dto.payload,
        sent_via: dto.sent_via,
        sent_at: new Date(),
      },
    });
    this.logger.info('Notification created', { id: created.id, userId: created.user_id });
    return this.toDto(created);
  }

  async findByUser(userId: string | undefined, unreadOnly?: boolean): Promise<NotificationDto[]> {
    const where: any = { user_id: userId };
    if (unreadOnly) {
      where.read_at = null;
    }

    const records = await this.prisma.notification.findMany({
      where,
      orderBy: { sent_at: 'desc' },
    });
    this.logger.info('Fetched notifications for user', { userId, count: records.length });
    return records.map((n: any) => this.toDto(n));
  }

  async markAsRead(userId: string | undefined, notificationId: string): Promise<NotificationDto> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification || notification.user_id !== userId) {
      this.logger.warn('Mark read failed - notification not found or unauthorized: %o', {
        notificationId,
        userId,
      });
      throw new NotFoundException('Notification not found');
    }
    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { read_at: new Date() },
    });
    this.logger.info('Notification marked as read', { id: notificationId, userId });
    return this.toDto(updated);
  }

  async dismiss(userId: string | undefined, notificationId: string): Promise<NotificationDto> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification || notification.user_id !== userId) {
      this.logger.warn('Dismiss failed - notification not found or unauthorized: %o', {
        notificationId,
        userId,
      });
      throw new NotFoundException('Notification not found');
    }
    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { dismissed_at: new Date() },
    });
    this.logger.info('Notification dismissed', { id: notificationId, userId });
    return this.toDto(updated);
  }

  private toDto(n: any): NotificationDto {
    return {
      id: n.id,
      user_id: n.user_id,
      type: n.type,
      payload: n.payload,
      sent_via: n.sent_via,
      sent_at: n.sent_at,
      read_at: n.read_at,
      dismissed_at: n.dismissed_at,
    };
  }
}
