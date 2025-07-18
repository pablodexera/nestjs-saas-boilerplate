import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[UserE2E] PATCH /users/me/primary-workspace/:workspaceId', () => {
  let app: INestApplication;
  let admin: any;
  let member: any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
    // let wsAdmin: any;
    // wsAdmin = await getTestUserByEmail(process.env.SEED_WORKSPACE_ADMIN_EMAIL!);
  });

  afterAll(async () => {
    await app.close();
  });

  const workspaceId = process.env.SEED_WORKSPACE_ID!;

  it('allows workspace member to set their primary workspace', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/users/me/primary-workspace/${workspaceId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);

    expect(res.body.primary_workspace_id).toBe(workspaceId);
    expect(res.body.id).toBe(member.id);
  });

  it('allows admin to set their own primary workspace', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/users/me/primary-workspace/${workspaceId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(res.body.primary_workspace_id).toBe(workspaceId);
    expect(res.body.id).toBe(admin.id);
  });

  it('forbids setting primary workspace for another user', async () => {
    // This endpoint is always for the current user, so this is not directly possible.
    // But we can check that a user cannot set a workspace they are not a member of.
    await request(app.getHttpServer())
      .patch(`/users/me/primary-workspace/invalid-workspace-id`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(403);
  });

  it('returns 401 if no auth token is provided', async () => {
    await request(app.getHttpServer())
      .patch(`/users/me/primary-workspace/${workspaceId}`)
      .expect(401);
  });
});
