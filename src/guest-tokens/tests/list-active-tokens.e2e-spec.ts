import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[GuestTokensE2E] GET /guest-tokens/workspace/active', () => {
  let app: INestApplication;
  let admin: any;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows admin to list active guest tokens', async () => {
    const res = await request(app.getHttpServer())
      .get('/guest-tokens/workspace/active')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('forbids non-admins from listing active tokens', async () => {
    await request(app.getHttpServer()).get('/guest-tokens/workspace/active').expect(401); // No token
  });
});
