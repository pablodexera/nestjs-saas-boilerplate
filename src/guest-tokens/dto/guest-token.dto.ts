// src/guest-tokens/dto/guest-token.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class GuestTokenDto {
  @ApiProperty({ example: 'opaque_or_jwt_token' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'workspace_uuid', required: false })
  @IsOptional()
  @IsUUID()
  workspace_id?: string | null;

  @ApiProperty({ example: '2025-07-06T21:00:00Z' })
  @IsDateString()
  issued_at!: Date;

  @ApiProperty({ example: '2025-07-07T21:00:00Z' })
  @IsDateString()
  expires_at!: Date;

  @ApiProperty({ example: { canView: true }, required: false, type: Object })
  @IsOptional()
  permissions?: Record<string, any> | null;

  @ApiProperty({ example: 0 })
  @IsNumber()
  usage_count!: number;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsNumber()
  max_usage?: number;
}
