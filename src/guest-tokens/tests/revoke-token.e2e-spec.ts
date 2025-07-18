import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[GuestTokensE2E] DELETE /guest-tokens/:token', () => {
  let app: INestApplication;
  let admin: any;
  let issuedToken: string;

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
    admin = await getTestUserByEmail(process.env.SEED_ADMIN_EMAIL!);
    // Issue a guest token
    const res = await request(app.getHttpServer()).post('/guest-tokens/issue').expect(201);
    issuedToken = res.text;
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows admin to revoke a guest token', async () => {
    await request(app.getHttpServer())
      .delete(`/guest-tokens/${issuedToken}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
  });

  it('forbids non-admins from revoking', async () => {
    // Try to revoke again without auth
    await request(app.getHttpServer()).delete(`/guest-tokens/${issuedToken}`).expect(401);
  });
});
