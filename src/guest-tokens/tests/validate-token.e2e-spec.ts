import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[GuestTokensE2E] GET /guest-tokens/validate/:token', () => {
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
  });

  beforeEach(async () => {
    // Issue a fresh guest token for each test
    const res = await request(app.getHttpServer()).post('/guest-tokens/issue').expect(201);
    issuedToken = res.text;
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows admin to validate a guest token', async () => {
    const res = await request(app.getHttpServer())
      .get(`/guest-tokens/validate/${issuedToken}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    expect(res.body.token).toBe(issuedToken);
  });

  it('forbids non-admins from validating', async () => {
    await request(app.getHttpServer()).get(`/guest-tokens/validate/${issuedToken}`).expect(401); // No token
  });
});
