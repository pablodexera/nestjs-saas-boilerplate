// src/common/pipes/validation.pipe.ts
import {
  Injectable,
  ValidationPipe as NestValidationPipe,
  ValidationPipeOptions,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';

@Injectable()
export class ValidationPipe extends NestValidationPipe {
  constructor(options?: ValidationPipeOptions) {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors: ValidationError[]) => {
        return {
          statusCode: 400,
          message: 'Validation failed',
          errors: errors.map((error) => ({
            property: error.property,
            constraints: error.constraints,
            children: error.children,
          })),
        };
      },
      ...options,
    });
  }
}
