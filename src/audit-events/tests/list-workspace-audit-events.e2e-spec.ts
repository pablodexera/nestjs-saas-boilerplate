import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[AuditEventsE2E] GET /audit-events/workspace/:workspaceId', () => {
  let app: INestApplication;
  let wsAdmin: any;
  let member: any;
  let workspaceId: string;

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
    wsAdmin = await getTestUserByEmail(process.env.SEED_WORKSPACE_ADMIN_EMAIL!);
    member = await getTestUserByEmail(process.env.SEED_USER_EMAIL!);
    workspaceId = process.env.SEED_WORKSPACE_ID!;
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists audit events for the workspace (wsAdmin)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/audit-events/workspace/${workspaceId}`)
      .set('Authorization', `Bearer ${wsAdmin.token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('forbids non-members from listing workspace audit events', async () => {
    const fakeId = 'not-a-real-id';
    await request(app.getHttpServer())
      .get(`/audit-events/workspace/${fakeId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect([403, 404]);
  });

  it('returns 401 if no auth token is provided', async () => {
    await request(app.getHttpServer()).get(`/audit-events/workspace/${workspaceId}`).expect(401);
  });
});
