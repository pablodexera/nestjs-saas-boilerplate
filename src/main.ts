// src/main.ts
import { NestFactory } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { setupSwagger } from './docs/swagger.setup';
import { setupRedox } from './docs/redox.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = await app.resolve(PinoLogger);

  // Attach Pino logger
  app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter (logs errors, sends structured response)
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  // Secure headers
  app.use(helmet());

  // CORS (open, can restrict as needed)
  app.enableCors();

  // --- DETERMINISTIC API VERSIONING ---
  const apiVersion = 'v1';
  const apiPrefix = `api/${apiVersion}`;
  app.setGlobalPrefix(apiPrefix);

  // --- VERSIONED SWAGGER AND REDOC SETUP ---
  setupSwagger(app);
  await setupRedox(app);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;
  const appName = configService.get<string>('app.name') || 'Danila SaaS Boilerplate';

  await app.listen(port, () => {
    logger.info(`${appName} backend listening at http://localhost:${port}/${apiPrefix}/`);
    logger.info(`Swagger docs: http://localhost:${port}/${apiPrefix}/docs`);
    logger.info(`ReDoc docs: http://localhost:${port}/${apiPrefix}/redoc`);
  });
}

bootstrap();
