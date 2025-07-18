// IMPORTANT: Never modify or delete seeded workspaces or memberships in tests.
// Only add seeded users to test-created workspaces, never the reverse.
// All destructive operations must be scoped to test-created workspaces only.
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[WorkspacesE2E] PATCH /workspaces/:workspaceId', () => {
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
    const uniqueSlug = `e2e-update-${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Update Workspace', slug: uniqueSlug, owner_id: admin.id });
    if (!res.body || !res.body.id)
      throw new Error('workspace creation failed: ' + JSON.stringify(res.body));
    workspaceId = res.body.id;
    expect(workspaceId).toBeDefined();
    if (workspaceId) {
      createdWorkspaceIds.push(workspaceId);
    }
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
    // Clean up all workspaces created in tests
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

  it('allows OWNER to update workspace name', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Updated Name' })
      .expect(200);
    expect(res.body.name).toBe('Updated Name');
  });
  it('allows OWNER to update slug to unique value', async () => {
    const newSlug = `e2e-update-slug-${Date.now()}`;
    const res = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ slug: newSlug })
      .expect(200);
    expect(res.body.slug).toBe(newSlug);
  });
  it('updates slug to duplicate (should append random suffix)', async () => {
    // Create another workspace to get a taken slug
    const takenSlug = `e2e-update-dup-${Date.now()}`;
    const res1 = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Dup Slug', slug: takenSlug, owner_id: admin.id });
    createdWorkspaceIds.push(res1.body.id);
    // Try to update to the taken slug
    const res2 = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ slug: takenSlug })
      .expect(200);
    expect(res2.body.slug).not.toBe(takenSlug);
    expect(res2.body.slug.startsWith(takenSlug)).toBe(true);
    // Cleanup is handled in afterAll via createdWorkspaceIds array
  });
  it('slugifies non-slug string on update', async () => {
    const weirdSlug = 'Update Slug!@#';
    const res = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ slug: weirdSlug })
      .expect(200);
    expect(res.body.slug).toMatch(/^update-slug/);
  });
  it('returns 400 for empty slug', async () => {
    await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ slug: '' })
      .expect(400);
  });
  it('forbids MEMBER from updating workspace', async () => {
    await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Should Fail' })
      .expect(403);
  });
  it('forbids non-member from updating workspace', async () => {
    await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ name: 'Should Fail' })
      .expect(403);
  });
  it('returns 401 for unauthenticated user', async () => {
    await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}`)
      .send({ name: 'Should Fail' })
      .expect(401);
  });
  it('returns 404/403 for non-existent workspace', async () => {
    await request(app.getHttpServer())
      .patch('/workspaces/does-not-exist')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Should Fail' })
      .expect([403, 404]);
  });
});
