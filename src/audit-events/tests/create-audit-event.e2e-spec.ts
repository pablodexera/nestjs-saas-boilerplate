import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[AuditEventsE2E] POST /audit-events', () => {
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
    // No explicit cleanup needed; events are append-only
    await app.close();
  });

  it('allows admin to create an audit event', async () => {
    const res = await request(app.getHttpServer())
      .post('/audit-events')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        eventType: 'test.e2e.create',
        actorId: admin.id,
        workspaceId: process.env.SEED_WORKSPACE_ID!,
        details: { foo: 'bar' },
      })
      .expect(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.eventType).toBe('test.e2e.create');
  });

  it('forbids non-admins from creating audit events', async () => {
    await request(app.getHttpServer())
      .post('/audit-events')
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        eventType: 'test.e2e.create',
        actorId: member.id,
        workspaceId: process.env.SEED_WORKSPACE_ID!,
        details: { foo: 'bar' },
      })
      .expect(403);
  });

  it('returns 401 if no auth token is provided', async () => {
    await request(app.getHttpServer())
      .post('/audit-events')
      .send({
        eventType: 'test.e2e.create',
        actorId: admin.id,
        workspaceId: process.env.SEED_WORKSPACE_ID!,
        details: { foo: 'bar' },
      })
      .expect(401);
  });
});
