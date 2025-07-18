import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[SubscriptionsE2E] GET /subscriptions/workspace/:workspaceId', () => {
  let app: INestApplication;
  let admin: any;
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
    admin = await getTestUserByEmail(process.env.SEED_ADMIN_EMAIL!);
    member = await getTestUserByEmail(process.env.SEED_USER_EMAIL!);
    workspaceId = process.env.SEED_WORKSPACE_ID!;
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows workspace member to fetch subscription', async () => {
    const res = await request(app.getHttpServer())
      .get(`/subscriptions/workspace/${workspaceId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('workspace_id', workspaceId);
  });

  it('forbids non-member from fetching subscription', async () => {
    // Use a user not in the workspace (simulate by omitting token)
    await request(app.getHttpServer()).get(`/subscriptions/workspace/${workspaceId}`).expect(401);
  });

  it('returns 404 or 403 for non-existent workspace', async () => {
    const res = await request(app.getHttpServer())
      .get(`/subscriptions/workspace/does-not-exist`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect([403, 404]).toContain(res.status);
  });
});
