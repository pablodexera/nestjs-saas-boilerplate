// src/docs/redox.setup.ts

import { INestApplication } from '@nestjs/common';
import { NestjsRedoxModule, NestJSRedoxOptions } from 'nestjs-redox';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

export async function setupRedox(app: INestApplication) {
  const configService = app.get(ConfigService);
  const appName = configService.get<string>('app.name') || 'Danila SaaS Boilerplate';
  const appWebsite = configService.get<string>('app.website') || 'https://danila.app';
  const appEmail = configService.get<string>('app.email') || 'support@danila.app';

  const apiVersion = 'v1';
  const apiPrefix = `api/${apiVersion}`;
  const redocPath = `${apiPrefix}/redoc`;

  // (Re-)generate Swagger document
  const swaggerConfig = new DocumentBuilder()
    .setTitle(`${appName} API`)
    .setDescription(`Auto-generated API docs for ${appName}`)
    .setVersion(apiVersion)
    .addBearerAuth()
    .addServer(`${configService.get('app.url') || 'http://localhost:3000'}`)
    .setContact(appName, appWebsite, appEmail)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const redocOptions = new NestJSRedoxOptions({
    favicon: {
      url: '/docs/branding/favicon.ico',
    },
  });

  await NestjsRedoxModule.setup(redocPath, app, document, redocOptions);
}
