import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[SubscriptionsE2E] PATCH /subscriptions/workspace/:workspaceId/upgrade', () => {
  let app: INestApplication;
  let admin: any;
  let wsAdmin: any;
  let workspaceId: string;
  let originalPlan: string;

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
    wsAdmin = await getTestUserByEmail(process.env.SEED_WORKSPACE_ADMIN_EMAIL!);
    workspaceId = process.env.SEED_WORKSPACE_ID!;
    // Fetch original plan for cleanup
    const res = await request(app.getHttpServer())
      .get(`/subscriptions/workspace/${workspaceId}`)
      .set('Authorization', `Bearer ${admin.token}`);
    originalPlan = res.body.plan;
  });

  afterAll(async () => {
    // Revert plan to original
    await request(app.getHttpServer())
      .patch(`/subscriptions/workspace/${workspaceId}/upgrade`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ plan: originalPlan })
      .expect(200);
    await app.close();
  });

  it('allows admin to upgrade subscription', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/subscriptions/workspace/${workspaceId}/upgrade`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ plan: 'pro', billingPeriod: 'annual', seats: 5 })
      .expect(200);
    expect(res.body).toHaveProperty('plan', 'pro');
  });

  it('forbids workspace admin from upgrading subscription', async () => {
    await request(app.getHttpServer())
      .patch(`/subscriptions/workspace/${workspaceId}/upgrade`)
      .set('Authorization', `Bearer ${wsAdmin.token}`)
      .send({ plan: 'pro', billingPeriod: 'annual', seats: 5 })
      .expect(403);
  });

  it('forbids non-member from upgrading subscription', async () => {
    await request(app.getHttpServer())
      .patch(`/subscriptions/workspace/${workspaceId}/upgrade`)
      .send({ plan: 'pro', billingPeriod: 'annual', seats: 5 })
      .expect(401);
  });

  it('returns 404 or 403 for non-existent workspace', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/subscriptions/workspace/does-not-exist/upgrade`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ plan: 'pro', billingPeriod: 'annual', seats: 5 });
    expect([403, 404]).toContain(res.status);
  });
});
