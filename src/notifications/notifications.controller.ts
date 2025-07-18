import { Controller, Get, Post, Patch, Body, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';

import { NotificationsService } from './notifications.service';
import { NotificationDto } from './dto/notification.dto';
import { AdminOnly } from '../common/decorators/admin-only.decorator';
import { Authenticated } from '../common/decorators/authenticated.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly logger: PinoLogger,
  ) {}

  @Get('admin/all')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: List all notifications' })
  @ApiResponse({ status: 200, type: [NotificationDto] })
  async getAllNotifications(): Promise<NotificationDto[]> {
    this.logger.info('Admin listing all notifications');
    return await this.notificationsService.findAll();
  }

  @Post('admin/send')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: Send a notification to any user' })
  @ApiResponse({ status: 201, type: NotificationDto })
  async adminSendNotification(@Body() dto: NotificationDto): Promise<NotificationDto> {
    this.logger.info(
      { userId: dto.user_id, type: dto.type, channel: dto.sent_via },
      'Admin sending notification',
    );
    return await this.notificationsService.sendNotification(dto);
  }

  @Get()
  @Authenticated()
  @ApiOperation({ summary: 'User: List your notifications' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [NotificationDto] })
  async getMyNotifications(
    @Req() req: Request,
    @Query('unreadOnly') unreadOnly?: boolean,
  ): Promise<NotificationDto[]> {
    const userId = req.user?.id;
    this.logger.info({ userId, unreadOnly }, 'User listing own notifications');
    return await this.notificationsService.findByUser(userId, unreadOnly);
  }

  @Patch(':id/read')
  @Authenticated()
  @ApiOperation({ summary: 'User: Mark a notification as read' })
  @ApiResponse({ status: 200, type: NotificationDto })
  async markAsRead(
    @Req() req: Request,
    @Param('id') notificationId: string,
  ): Promise<NotificationDto> {
    const userId = req.user?.id;
    this.logger.info({ userId, notificationId }, 'User marking notification as read');
    return await this.notificationsService.markAsRead(userId, notificationId);
  }

  @Patch(':id/dismiss')
  @Authenticated()
  @ApiOperation({ summary: 'User: Dismiss a notification' })
  @ApiResponse({ status: 200, type: NotificationDto })
  async dismissNotification(
    @Req() req: Request,
    @Param('id') notificationId: string,
  ): Promise<NotificationDto> {
    const userId = req.user?.id;
    this.logger.info({ userId, notificationId }, 'User dismissing notification');
    return await this.notificationsService.dismiss(userId, notificationId);
  }
}
