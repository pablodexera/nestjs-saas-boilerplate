// src/users/users.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { ClerkUserDto } from '../auth/dto/clerk-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {}

  async createFromClerk(data: ClerkUserDto): Promise<UserResponseDto> {
    const dto: CreateUserDto = {
      id: data.id,
      email: data.email_addresses?.[0]?.email_address || '',
      full_name: [data.first_name, data.last_name].filter(Boolean).join(' ').trim() || undefined,
      avatar_url: data.image_url,
      is_global_admin: false,
      primary_workspace_id: undefined,
      country:
        (data.public_metadata as any)?.country ||
        (data.private_metadata as any)?.country ||
        undefined,
      social_provider:
        (data.public_metadata as any)?.social_provider ||
        (data.private_metadata as any)?.social_provider ||
        undefined,
      is_disabled: false,
    } as CreateUserDto;

    return this.create(dto);
  }

  async upsertFromClerk(data: Partial<CreateUserDto>): Promise<UserResponseDto> {
    if (!data.id) throw new BadRequestException('User ID is required');
    const user = await this.prisma.user.upsert({
      where: { id: data.id },
      update: {
        email: data.email,
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        is_global_admin: data.is_global_admin ?? false,
        primary_workspace_id: data.primary_workspace_id,
        last_login_at: (data as any).last_login_at ?? null,
        social_provider: (data as any).social_provider,
        country: (data as any).country,
        is_disabled: data.is_disabled ?? false,
      },
      create: {
        id: data.id!,
        email: data.email!,
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        is_global_admin: data.is_global_admin ?? false,
        primary_workspace_id: data.primary_workspace_id,
        created_at: (data as any).created_at ?? new Date(),
        updated_at: (data as any).updated_at ?? new Date(),
        last_login_at: (data as any).last_login_at ?? null,
        social_provider: (data as any).social_provider,
        country: (data as any).country,
        is_disabled: data.is_disabled ?? false,
      },
    });
    this.logger.info('User upserted from Clerk', { userId: user.id });
    return this.toResponseDto(user);
  }

  async setPrimaryWorkspace(
    userId: string | undefined,
    workspaceId: string,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { primary_workspace_id: workspaceId },
    });
    this.logger.info('Primary workspace set', { userId, workspaceId });
    return this.toResponseDto(user);
  }

  async updateLastLogin(userId: string, date: Date = new Date()): Promise<UserResponseDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { last_login_at: date },
    });
    this.logger.info('User last login updated', { userId, date: date.toISOString() });
    return this.toResponseDto(user);
  }

  async create(data: CreateUserDto): Promise<UserResponseDto> {
    try {
      const user = await this.prisma.user.create({ data });
      this.logger.info('User created: %o', { userId: user.id, email: user.email });
      return this.toResponseDto(user);
    } catch (error) {
      const err = error as Error;
      this.logger.error('User creation failed: %o', { error: err.message });
      throw new BadRequestException('Could not create user');
    }
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany();
    return users.map((u: any) => this.toResponseDto(u));
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.toResponseDto(user);
  }

  async findByEmail(email: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    return this.toResponseDto(user);
  }

  async update(id: string, data: UpdateUserDto): Promise<UserResponseDto> {
    if (!id) throw new BadRequestException('User ID is required');
    try {
      const user = await this.prisma.user.update({ where: { id }, data });
      this.logger.info(`User updated: ${user.id}`, { userId: user.id });
      return this.toResponseDto(user);
    } catch (error: any) {
      this.logger.error('User update failed: %o', { error: error.message });
      // Prisma error code for not found is 'P2025'
      if (error.code === 'P2025' || error.message?.includes('No record found')) {
        throw new NotFoundException('User not found');
      }
      throw new BadRequestException('Could not update user');
    }
  }

  async remove(id: string): Promise<void> {
    if (!id) throw new BadRequestException('User ID is required');
    try {
      await this.prisma.user.delete({ where: { id } });
      this.logger.info(`User deleted: ${id}`);
    } catch (error: any) {
      this.logger.error('User deletion failed: %o', { error: error.message });
      // Prisma error code for not found is 'P2025'
      if (error.code === 'P2025' || error.message?.includes('No record found')) {
        throw new NotFoundException('User not found');
      }
      throw new BadRequestException('Could not delete user');
    }
  }

  // Utility to convert Prisma model to DTO
  private toResponseDto(user: any): UserResponseDto {
    const {
      id,
      email,
      full_name,
      avatar_url,
      is_global_admin,
      primary_workspace_id,
      created_at,
      updated_at,
      last_login_at,
      social_provider,
      country,
      is_disabled,
    } = user;
    return {
      id,
      email,
      full_name,
      avatar_url,
      is_global_admin,
      primary_workspace_id,
      created_at,
      updated_at,
      last_login_at,
      social_provider,
      country,
      is_disabled,
    };
  }
}
