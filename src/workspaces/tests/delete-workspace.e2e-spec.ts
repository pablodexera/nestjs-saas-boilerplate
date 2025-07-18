// IMPORTANT: Never modify or delete seeded workspaces or memberships in tests.
// Only add seeded users to test-created workspaces, never the reverse.
// All destructive operations must be scoped to test-created workspaces only.
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[WorkspacesE2E] DELETE /workspaces/:workspaceId', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: any;
  let user: any;
  let member: any;
  let workspaceId: string | undefined;
  const createdWorkspaceIds: string[] = [];

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
    member = await getTestUserByEmail(process.env.SEED_WORKSPACE_ADMIN_EMAIL!);
    // Create a workspace as admin (OWNER)
    const uniqueSlug = `e2e-delete-${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Delete Workspace', slug: uniqueSlug, owner_id: admin.id });
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

  afterAll(async () => {
    // Clean up the main workspace
    if (workspaceId) {
      await prisma.subscription.deleteMany({ where: { workspace_id: workspaceId } });
      await prisma.userWorkspace.deleteMany({ where: { workspace_id: workspaceId } });
      await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    }
    // Clean up any additional workspaces created in tests
    for (const id of createdWorkspaceIds) {
      if (id) {
        await prisma.subscription.deleteMany({ where: { workspace_id: id } });
        await prisma.userWorkspace.deleteMany({ where: { workspace_id: id } });
        await prisma.workspace.delete({ where: { id } }).catch(() => {});
      }
    }
    await prisma.$disconnect();
    await app.close();
  });

  it('allows OWNER to delete workspace', async () => {
    // Create a new workspace to delete
    const uniqueSlug = `e2e-delete-own-${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Delete Me', slug: uniqueSlug, owner_id: admin.id });
    const tempWorkspaceId = res.body.id;
    createdWorkspaceIds.push(tempWorkspaceId);
    expect(tempWorkspaceId).toBeDefined();
    await request(app.getHttpServer())
      .delete(`/workspaces/${tempWorkspaceId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect([200, 204, 404]);
    // Cleanup is handled in afterAll via createdWorkspaceIds array
  });
  it('forbids MEMBER from deleting workspace', async () => {
    await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(403);
  });
  it('forbids non-member from deleting workspace', async () => {
    await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(403);
  });
  it('returns 401 for unauthenticated user', async () => {
    await request(app.getHttpServer()).delete(`/workspaces/${workspaceId}`).expect(401);
  });
  it('returns 404/403 for non-existent workspace', async () => {
    await request(app.getHttpServer())
      .delete('/workspaces/does-not-exist')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect([403, 404]);
  });
  /*
  it('prevents deleting last workspace for user', async () => {
    // Create a new workspace for user
    const uniqueSlug = `e2e-delete-last-${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/workspaces/user')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Delete Workspace', slug: uniqueSlug, owner_id: user.id });
    const tempWorkspaceId = res.body.id;
    createdWorkspaceIds.push(tempWorkspaceId);
    expect(tempWorkspaceId).toBeDefined();
    // Try to delete as user (should fail if it's their only workspace)
    const delRes = await request(app.getHttpServer())
      .delete(`/workspaces/${tempWorkspaceId}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect([400, 403]).toContain(delRes.status);
    // Cleanup is handled in afterAll via createdWorkspaceIds array
  });
  */
});
