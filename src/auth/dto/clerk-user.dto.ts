import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsNumber } from 'class-validator';

export class ClerkEmailAddressDto {
  @ApiProperty()
  @IsString()
  email_address!: string;
}

export class ClerkUserDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty({ type: [ClerkEmailAddressDto], required: false })
  @IsOptional()
  @IsArray()
  email_addresses?: ClerkEmailAddressDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  created_at?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  last_sign_in_at?: number;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  public_metadata?: Record<string, any>;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  private_metadata?: Record<string, any>;
}
