// IMPORTANT: Never modify or delete seeded users in tests. Users are managed by Clerk.
// Only use seeded users for all user actions. All destructive operations must be scoped to test-created workspaces only.
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[UserWorkspacesE2E] POST /user-workspaces/:workspaceId/members/decline', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: any;
  let member: any;
  let workspaceId: string | undefined;
  let invitedUserId: string | undefined;

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
    prisma = new PrismaClient();
    admin = await getTestUserByEmail(process.env.SEED_ADMIN_EMAIL!);
    member = await getTestUserByEmail(process.env.SEED_USER_EMAIL!);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Create a new workspace and invite the seeded member for each test
    const uniqueSlug = `e2e-decline-invite-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const res = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Decline Invite Workspace', slug: uniqueSlug, owner_id: admin.id });
    if (!res.body || !res.body.id)
      throw new Error('workspace creation failed: ' + JSON.stringify(res.body));
    workspaceId = res.body.id;
    if (!workspaceId) throw new Error('workspaceId not set');
    // Invite the seeded member
    const inviteRes = await request(app.getHttpServer())
      .post(`/user-workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: member.email });
    invitedUserId = inviteRes.body.user_id;
    if (!invitedUserId) throw new Error('invitedUserId not set');
  });

  afterEach(async () => {
    if (workspaceId) {
      await prisma.subscription.deleteMany({ where: { workspace_id: workspaceId } });
      await prisma.userWorkspace.deleteMany({ where: { workspace_id: workspaceId } });
      await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    }
  });

  it('allows invited user to decline invite', async () => {
    await request(app.getHttpServer())
      .post(`/user-workspaces/${workspaceId}/members/decline`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(204);
    // Membership should now be removed
    const membership = await prisma.userWorkspace.findUnique({
      where: { user_id_workspace_id: { user_id: invitedUserId!, workspace_id: workspaceId! } },
    });
    expect(membership?.status).toBe('removed');
  });

  it('returns 404 for already removed invite', async () => {
    // Decline once
    await request(app.getHttpServer())
      .post(`/user-workspaces/${workspaceId}/members/decline`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(204);
    // Decline again
    await request(app.getHttpServer())
      .post(`/user-workspaces/${workspaceId}/members/decline`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(404);
  });

  it('returns 404 for non-invited seeded user', async () => {
    // Use a seeded user who was not invited
    const outsider = await getTestUserByEmail(process.env.SEED_WORKSPACE_ADMIN_EMAIL!);
    await request(app.getHttpServer())
      .post(`/user-workspaces/${workspaceId}/members/decline`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(404);
  });

  it('returns 401 for unauthenticated user', async () => {
    await request(app.getHttpServer())
      .post(`/user-workspaces/${workspaceId}/members/decline`)
      .expect(401);
  });
});
