// IMPORTANT: Never modify or delete seeded workspaces or memberships in tests.
// Only add seeded users to test-created workspaces, never the reverse.
// All destructive operations must be scoped to test-created workspaces only.
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[UserWorkspacesE2E] DELETE /user-workspaces/:workspaceId/members/leave', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: any;
  let user: any;
  let workspaceId: string | undefined;

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
    user = await getTestUserByEmail(process.env.SEED_USER_EMAIL!);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Create a new workspace for each test
    const uniqueSlug = `e2e-leave-workspace-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const res = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Leave Workspace', slug: uniqueSlug, owner_id: admin.id });
    if (!res.body || !res.body.id)
      throw new Error('workspace creation failed: ' + JSON.stringify(res.body));
    workspaceId = res.body.id;
    if (!workspaceId) throw new Error('workspaceId not set');
    // Add user as MEMBER
    await prisma.userWorkspace.upsert({
      where: { user_id_workspace_id: { user_id: user.id, workspace_id: workspaceId! } },
      update: { status: 'active', role: 'MEMBER' },
      create: {
        user_id: user.id,
        workspace_id: workspaceId!,
        status: 'active',
        role: 'MEMBER',
        joined_at: new Date(),
      },
    });
  });

  afterEach(async () => {
    if (workspaceId) {
      await prisma.subscription.deleteMany({ where: { workspace_id: workspaceId } });
      await prisma.userWorkspace.deleteMany({ where: { workspace_id: workspaceId } });
      await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    }
  });

  it('allows MEMBER to leave workspace', async () => {
    // Ensure user is MEMBER
    await prisma.userWorkspace.update({
      where: { user_id_workspace_id: { user_id: user.id, workspace_id: workspaceId! } },
      data: { status: 'active', role: 'MEMBER' },
    });
    await request(app.getHttpServer())
      .delete(`/user-workspaces/${workspaceId}/members/leave`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(204);
    // Membership should now be removed
    const membership = await prisma.userWorkspace.findUnique({
      where: { user_id_workspace_id: { user_id: user.id, workspace_id: workspaceId! } },
    });
    expect(membership?.status).toBe('removed');
  });

  it('prevents OWNER from leaving if last admin/owner', async () => {
    // Remove all other members
    await prisma.userWorkspace.deleteMany({
      where: { workspace_id: workspaceId!, user_id: { not: admin.id } },
    });
    await request(app.getHttpServer())
      .delete(`/user-workspaces/${workspaceId}/members/leave`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(403);
  });

  it('returns 401 for unauthenticated user', async () => {
    await request(app.getHttpServer())
      .delete(`/user-workspaces/${workspaceId}/members/leave`)
      .expect(401);
  });

  it('returns 404 for non-member', async () => {
    // Remove user from workspace
    await prisma.userWorkspace.update({
      where: { user_id_workspace_id: { user_id: user.id, workspace_id: workspaceId! } },
      data: { status: 'removed' },
    });
    await request(app.getHttpServer())
      .delete(`/user-workspaces/${workspaceId}/members/leave`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(404);
  });
});
