// src/config/config.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration from './configuration';
import { validationSchema } from './validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
  ],
})
export class AppConfigModule {}
