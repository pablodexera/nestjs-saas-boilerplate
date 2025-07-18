// IMPORTANT: Never modify or delete seeded workspaces or memberships in tests.
// Only add seeded users to test-created workspaces, never the reverse.
// All destructive operations must be scoped to test-created workspaces only.
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';
import { WorkspaceRole } from '../../common/enums/workspace-role.enum';

describe('[UserWorkspacesE2E] PATCH /user-workspaces/:workspaceId/members/:userId/role', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: any;
  let user: any;
  let outsider: any;
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
    outsider = await getTestUserByEmail(process.env.SEED_WORKSPACE_ADMIN_EMAIL!);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Create a new workspace for each test
    const uniqueSlug = `e2e-update-role-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const res = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Update Role Workspace', slug: uniqueSlug, owner_id: admin.id });
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
    // Remove outsider from workspace
    await prisma.userWorkspace.deleteMany({
      where: { user_id: outsider.id, workspace_id: workspaceId! },
    });
  });

  afterEach(async () => {
    if (workspaceId) {
      await prisma.subscription.deleteMany({ where: { workspace_id: workspaceId } });
      await prisma.userWorkspace.deleteMany({ where: { workspace_id: workspaceId } });
      await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    }
  });

  it('allows OWNER to promote MEMBER to ADMIN', async () => {
    // Ensure user is MEMBER
    await prisma.userWorkspace.update({
      where: { user_id_workspace_id: { user_id: user.id, workspace_id: workspaceId! } },
      data: { role: WorkspaceRole.MEMBER, status: 'active' },
    });
    const res = await request(app.getHttpServer())
      .patch(`/user-workspaces/${workspaceId!}/members/${user.id}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: WorkspaceRole.ADMIN })
      .expect(200);
    expect(res.body.role).toBe(WorkspaceRole.ADMIN);
  });

  it('forbids MEMBER from updating role', async () => {
    // Ensure user is MEMBER, admin is OWNER
    await prisma.userWorkspace.update({
      where: { user_id_workspace_id: { user_id: user.id, workspace_id: workspaceId! } },
      data: { role: WorkspaceRole.MEMBER, status: 'active' },
    });
    await prisma.userWorkspace.update({
      where: { user_id_workspace_id: { user_id: admin.id, workspace_id: workspaceId! } },
      data: { role: WorkspaceRole.OWNER, status: 'active' },
    });
    await request(app.getHttpServer())
      .patch(`/user-workspaces/${workspaceId!}/members/${admin.id}/role`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ role: WorkspaceRole.MEMBER })
      .expect(403);
  });

  it('forbids non-member from updating role', async () => {
    // outsider is not a member
    await request(app.getHttpServer())
      .patch(`/user-workspaces/${workspaceId!}/members/${admin.id}/role`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ role: WorkspaceRole.MEMBER })
      .expect(403);
  });

  it('returns 401 for unauthenticated user', async () => {
    await request(app.getHttpServer())
      .patch(`/user-workspaces/${workspaceId!}/members/${user.id}/role`)
      .send({ role: WorkspaceRole.ADMIN })
      .expect(401);
  });

  it('returns 404 for non-existent member', async () => {
    await request(app.getHttpServer())
      .patch(`/user-workspaces/${workspaceId!}/members/does-not-exist/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: WorkspaceRole.ADMIN })
      .expect(404);
  });

  it('prevents demoting last ADMIN', async () => {
    // Promote user to ADMIN, admin is OWNER
    await prisma.userWorkspace.update({
      where: { user_id_workspace_id: { user_id: user.id, workspace_id: workspaceId! } },
      data: { role: WorkspaceRole.ADMIN, status: 'active' },
    });
    await prisma.userWorkspace.update({
      where: { user_id_workspace_id: { user_id: admin.id, workspace_id: workspaceId! } },
      data: { role: WorkspaceRole.OWNER, status: 'active' },
    });
    // Demote user (should succeed, since admin is OWNER/ADMIN)
    await request(app.getHttpServer())
      .patch(`/user-workspaces/${workspaceId!}/members/${user.id}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: WorkspaceRole.MEMBER })
      .expect(200);
    // Now make admin ADMIN (not OWNER)
    await prisma.userWorkspace.update({
      where: { user_id_workspace_id: { user_id: admin.id, workspace_id: workspaceId! } },
      data: { role: WorkspaceRole.ADMIN, status: 'active' },
    });
    // Demote admin (should fail if admin is last ADMIN/OWNER)
    await request(app.getHttpServer())
      .patch(`/user-workspaces/${workspaceId!}/members/${admin.id}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: WorkspaceRole.MEMBER })
      .expect(400);
  });

  it('allows admin to update member role', async () => {
    // Add wsAdmin as ADMIN
    const wsAdmin = await getTestUserByEmail(process.env.SEED_WORKSPACE_ADMIN_EMAIL!);
    await prisma.userWorkspace.upsert({
      where: { user_id_workspace_id: { user_id: wsAdmin.id, workspace_id: workspaceId! } },
      update: { status: 'active', role: 'ADMIN' },
      create: {
        user_id: wsAdmin.id,
        workspace_id: workspaceId!,
        status: 'active',
        role: 'ADMIN',
        joined_at: new Date(),
      },
    });
    // Ensure invitedUser is MEMBER
    const invitedUser = await getTestUserByEmail(process.env.SEED_USER_EMAIL!);
    await prisma.userWorkspace.update({
      where: { user_id_workspace_id: { user_id: invitedUser.id, workspace_id: workspaceId! } },
      data: { role: WorkspaceRole.MEMBER, status: 'active' },
    });
    const res = await request(app.getHttpServer())
      .patch(`/user-workspaces/${workspaceId!}/members/${invitedUser.id}/role`)
      .set('Authorization', `Bearer ${wsAdmin.token}`)
      .send({ role: WorkspaceRole.ADMIN })
      .expect(200);
    expect(res.body.role).toBe(WorkspaceRole.ADMIN);
  });

  it('forbids regular member from updating role', async () => {
    // Ensure both are MEMBER
    const invitedUser = await getTestUserByEmail(process.env.SEED_USER_EMAIL!);
    await prisma.userWorkspace.update({
      where: { user_id_workspace_id: { user_id: invitedUser.id, workspace_id: workspaceId! } },
      data: { role: WorkspaceRole.MEMBER, status: 'active' },
    });
    await prisma.userWorkspace.update({
      where: { user_id_workspace_id: { user_id: user.id, workspace_id: workspaceId! } },
      data: { role: WorkspaceRole.MEMBER, status: 'active' },
    });
    await request(app.getHttpServer())
      .patch(`/user-workspaces/${workspaceId!}/members/${invitedUser.id}/role`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ role: WorkspaceRole.ADMIN })
      .expect(403);
  });

  it('returns 401 if no auth token is provided', async () => {
    const invitedUser = await getTestUserByEmail(process.env.SEED_USER_EMAIL!);
    await request(app.getHttpServer())
      .patch(`/user-workspaces/${workspaceId!}/members/${invitedUser.id}/role`)
      .send({ role: WorkspaceRole.ADMIN })
      .expect(401);
  });
});
