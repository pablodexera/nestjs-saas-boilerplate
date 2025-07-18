// src/users/dto/create-user.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsBoolean,
  IsUUID,
  Matches,
  IsUrl,
  Length,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'clerk_user_uuid' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9 .,'-]+$/, {
    message: 'Full name must be alphanumeric and may include spaces and common punctuation',
  })
  full_name?: string;

  @ApiProperty({ example: 'https://example.com/avatar.png', required: false })
  @IsOptional()
  @IsUrl()
  avatar_url?: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  is_global_admin?: boolean;

  @ApiProperty({ example: 'workspace_uuid', required: false })
  @IsOptional()
  @IsUUID()
  primary_workspace_id?: string;

  @ApiProperty({ example: 'NL', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Country must be a 2-letter ISO code' })
  country?: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  is_disabled?: boolean;
}
