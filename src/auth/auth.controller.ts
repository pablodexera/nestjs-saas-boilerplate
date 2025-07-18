// src/auth/auth.controller.ts

import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { ClerkUserDto } from './dto/clerk-user.dto';
import { WebhookGuard } from '../common/guards/webhook.guard';

@ApiTags('auth')
@Controller('auth') // Will be routed as /api/v1/auth/...
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: Logger,
  ) {}

  // --- Clerk Webhook: User Created ---
  @Post('webhook/clerk/user-created')
  @HttpCode(HttpStatus.OK)
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'Clerk webhook for user.created' })
  @ApiResponse({ status: 200, description: 'User processed.' })
  async clerkUserCreated(@Body() data: ClerkUserDto) {
    this.logger.log('Clerk user.created webhook received: %o', { clerkId: data.id });
    const user = await this.authService.handleClerkUserCreated(data);
    return { success: true, userId: user.id };
  }

  // --- Clerk Webhook: User Logged In ---
  @Post('webhook/clerk/user-loggedin')
  @HttpCode(HttpStatus.OK)
  @UseGuards(WebhookGuard)
  @ApiOperation({ summary: 'Clerk webhook for user.logged_in' })
  @ApiResponse({ status: 200, description: 'Login event processed.' })
  async clerkUserLoggedIn(@Body() data: ClerkUserDto) {
    this.logger.log('Clerk user.logged_in webhook received: %o', { clerkId: data.id });
    const user = await this.authService.handleClerkUserLoggedIn(data);
    return { success: true, userId: user.id };
  }
}
