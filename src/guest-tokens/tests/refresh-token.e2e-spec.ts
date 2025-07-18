import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jwtDecode } from 'jwt-decode';

import { AppModule } from '../../app.module';

interface GuestTokenPayload {
  workspaceId: string;
  guest: boolean;
}

const GUEST_WORKSPACE_ID = process.env.GUEST_WORKSPACE_ID || 'guest-demo-workspace-id';

describe('[GuestTokensE2E] POST /guest-tokens/refresh', () => {
  let app: INestApplication;
  let issuedToken: string;
  let guestWorkspaceId: string;

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

    // Issue a guest token
    const res = await request(app.getHttpServer()).post('/guest-tokens/issue').expect(201);
    issuedToken = res.text;
    const decoded = jwtDecode<GuestTokenPayload>(issuedToken);
    guestWorkspaceId = decoded.workspaceId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('refreshes a guest token (guest allowed)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/guest-tokens/refresh/${guestWorkspaceId}`)
      .set('Authorization', `Bearer ${issuedToken}`)
      .send({ token: issuedToken })
      .expect(201);
    const newToken = res.text;
    expect(typeof newToken).toBe('string');
    expect(newToken.split('.').length).toBe(3);
    const decoded = jwtDecode<GuestTokenPayload>(newToken);
    expect(decoded.workspaceId).toBe(GUEST_WORKSPACE_ID);
    expect(decoded.guest).toBe(true);
    expect(newToken).not.toBe(issuedToken);
  });

  it('returns 400 for missing token', async () => {
    await request(app.getHttpServer())
      .post(`/guest-tokens/refresh/${guestWorkspaceId}`)
      .set('Authorization', `Bearer ${issuedToken}`)
      .send({})
      .expect(400);
  });
});
