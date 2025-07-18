import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jwtDecode } from 'jwt-decode';

import { AppModule } from '../../app.module';

const GUEST_WORKSPACE_ID = process.env.GUEST_WORKSPACE_ID || 'guest-demo-workspace-id';

describe('[GuestTokensE2E] POST /guest-tokens/issue', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new (await import('@nestjs/common')).ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('issues a guest token (public endpoint)', async () => {
    const res = await request(app.getHttpServer()).post('/guest-tokens/issue').expect(201);
    const token = res.text;
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT format
    const decoded: any = jwtDecode(token);
    expect(decoded.workspaceId).toBe(GUEST_WORKSPACE_ID);
    expect(decoded.guest).toBe(true);
  });
});
