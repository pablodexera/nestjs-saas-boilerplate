// src/docs/swagger.setup.ts

import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

export function setupSwagger(app: INestApplication) {
  const configService = app.get(ConfigService);
  const appName = configService.get<string>('app.name') || 'Danila SaaS Boilerplate';
  const appWebsite = configService.get<string>('app.website') || 'https://danila.app';
  const appEmail = configService.get<string>('app.email') || 'support@danila.app';

  const apiVersion = 'v1';
  const apiPrefix = `api/${apiVersion}`;
  const swaggerPath = `${apiPrefix}/docs`;

  const swaggerConfig = new DocumentBuilder()
    .setTitle(`${appName} API`)
    .setDescription(`Auto-generated API docs for ${appName}`)
    .setVersion(apiVersion)
    .addBearerAuth()
    .addServer(`${configService.get('app.url') || 'http://localhost:3000'}`)
    .setContact(appName, appWebsite, appEmail)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(swaggerPath, app, document);
}
