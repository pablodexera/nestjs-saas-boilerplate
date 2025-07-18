import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[SubscriptionsE2E] PATCH /subscriptions/workspace/:workspaceId/billing', () => {
  let app: INestApplication;
  let admin: any;
  let wsAdmin: any;
  let member: any;
  let workspaceId: string;
  let originalBilling: string;

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
    member = await getTestUserByEmail(process.env.SEED_USER_EMAIL!);
    workspaceId = process.env.SEED_WORKSPACE_ID!;
    // Fetch original billing for cleanup
    const res = await request(app.getHttpServer())
      .get(`/subscriptions/workspace/${workspaceId}`)
      .set('Authorization', `Bearer ${admin.token}`);
    originalBilling = res.body.billing_period;
  });

  afterAll(async () => {
    // Revert billing to original
    await request(app.getHttpServer())
      .patch(`/subscriptions/workspace/${workspaceId}/billing`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ billing_period: originalBilling })
      .expect(200);
    await app.close();
  });

  it('allows admin to set billing period', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/subscriptions/workspace/${workspaceId}/billing`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ billing_period: 'annual' })
      .expect(200);
    expect(res.body).toHaveProperty('billing_period', 'annual');
  });

  it('forbids workspace admin from setting billing period', async () => {
    await request(app.getHttpServer())
      .patch(`/subscriptions/workspace/${workspaceId}/billing`)
      .set('Authorization', `Bearer ${wsAdmin.token}`)
      .send({ billing_period: 'monthly' })
      .expect(403);
  });

  it('forbids regular member from setting billing period', async () => {
    await request(app.getHttpServer())
      .patch(`/subscriptions/workspace/${workspaceId}/billing`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ billing_period: 'monthly' })
      .expect(403);
  });

  it('returns 404 for non-existent workspace', async () => {
    await request(app.getHttpServer())
      .patch(`/subscriptions/workspace/does-not-exist/billing`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ billing_period: 'monthly' })
      .expect(404);
  });
});
