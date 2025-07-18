import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[AuditEventsE2E] GET /audit-events/user', () => {
  let app: INestApplication;
  let member: any;

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
    member = await getTestUserByEmail(process.env.SEED_USER_EMAIL!);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists audit events for the user', async () => {
    const res = await request(app.getHttpServer())
      .get('/audit-events/user')
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 401 if no auth token is provided', async () => {
    await request(app.getHttpServer()).get('/audit-events/user').expect(401);
  });
});
