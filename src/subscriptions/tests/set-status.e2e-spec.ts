import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[SubscriptionsE2E] PATCH /subscriptions/workspace/:workspaceId/status', () => {
  let app: INestApplication;
  let admin: any;
  let wsAdmin: any;
  let workspaceId: string;
  let originalStatus: string;

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
    // Fetch original status for cleanup
    const res = await request(app.getHttpServer())
      .get(`/subscriptions/workspace/${workspaceId}`)
      .set('Authorization', `Bearer ${admin.token}`);
    originalStatus = res.body.status;
  });

  afterAll(async () => {
    // Revert status to original
    await request(app.getHttpServer())
      .patch(`/subscriptions/workspace/${workspaceId}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: originalStatus })
      .expect(200);
    await app.close();
  });

  it('allows global admin to set subscription status', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/subscriptions/workspace/${workspaceId}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'cancelled' })
      .expect(200);
    expect(res.body).toHaveProperty('status', 'cancelled');
  });

  it('forbids workspace admin from setting status', async () => {
    await request(app.getHttpServer())
      .patch(`/subscriptions/workspace/${workspaceId}/status`)
      .set('Authorization', `Bearer ${wsAdmin.token}`)
      .send({ status: 'active' })
      .expect(403);
  });

  it('returns 404 for non-existent workspace', async () => {
    await request(app.getHttpServer())
      .patch(`/subscriptions/workspace/does-not-exist/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'active' })
      .expect(404);
  });
});
