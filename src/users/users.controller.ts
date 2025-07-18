// src/users/users.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  ForbiddenException,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { AdminOnly } from '../common/decorators/admin-only.decorator';
import { WorkspaceMember } from '../common/decorators/workspace-member.decorator';
import { Authenticated } from '../common/decorators/authenticated.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @AdminOnly()
  @ApiOperation({ summary: 'Create user (Admin only)' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @AdminOnly()
  @ApiOperation({ summary: 'List all users (Admin only)' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  async findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Authenticated()
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOperation({ summary: 'Get user by ID (Admin or self only)' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden: can only access own profile unless admin' })
  async findOne(@Param('id') id: string, @Req() req: Request): Promise<UserResponseDto> {
    const currentUserId = (req.user as any)?.id;
    const isAdmin = (req.user as any)?.is_global_admin === true;

    if (!isAdmin && currentUserId !== id) {
      throw new ForbiddenException('Can only access own profile unless admin');
    }

    return this.usersService.findById(id);
  }

  // ---- Moved above the generic ':id' patch to avoid being blocked ----
  @Patch('me/primary-workspace/:workspaceId')
  @WorkspaceMember()
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiOperation({ summary: 'Set primary workspace (Workspace member only)' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async setPrimaryWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    return this.usersService.setPrimaryWorkspace(req.user?.id, workspaceId);
  }

  @Patch(':id')
  @Authenticated()
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOperation({ summary: 'Update user (Admin or self only)' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden: can only update own profile unless admin' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    const currentUserId = (req.user as any)?.id;
    const isAdmin = (req.user as any)?.is_global_admin === true;

    if (!isAdmin && currentUserId !== id) {
      throw new ForbiddenException('Can only update own profile unless admin');
    }

    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @AdminOnly()
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiResponse({ status: 204 })
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}
