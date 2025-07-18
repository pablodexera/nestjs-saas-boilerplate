import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[AuditEventsE2E] GET /audit-events (query)', () => {
  let app: INestApplication;
  let admin: any;
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
    admin = await getTestUserByEmail(process.env.SEED_ADMIN_EMAIL!);
    member = await getTestUserByEmail(process.env.SEED_USER_EMAIL!);
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows admin to query audit events by eventType', async () => {
    const res = await request(app.getHttpServer())
      .get('/audit-events?eventType=test.e2e.create')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('forbids non-admins from querying audit events', async () => {
    await request(app.getHttpServer())
      .get('/audit-events?eventType=test.e2e.create')
      .set('Authorization', `Bearer ${member.token}`)
      .expect(403);
  });

  it('returns 401 if no auth token is provided', async () => {
    await request(app.getHttpServer()).get('/audit-events?eventType=test.e2e.create').expect(401);
  });
});
