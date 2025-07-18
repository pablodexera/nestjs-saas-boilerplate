// IMPORTANT: Never modify or delete seeded workspaces or memberships in tests.
// Only add seeded users to test-created workspaces, never the reverse.
// All destructive operations must be scoped to test-created workspaces only.
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[WorkspacesE2E] POST /workspaces and /workspaces/user', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: any;
  let user: any;
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
  });

  afterAll(async () => {
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

  describe('POST /workspaces (admin only)', () => {
    it('allows admin to create workspace for self with unique slug', async () => {
      const uniqueSlug = `e2e-admin-own-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ name: 'Create Workspace', slug: uniqueSlug, owner_id: admin.id });
      if (!res.body || !res.body.id)
        throw new Error('workspace creation failed: ' + JSON.stringify(res.body));
      const workspaceId = res.body.id;
      expect(workspaceId).toBeDefined();
      expect(res.body.slug).toBe(uniqueSlug);
      createdWorkspaceIds.push(workspaceId);
      // Check membership
      const membership = await prisma.userWorkspace.findUnique({
        where: { user_id_workspace_id: { user_id: admin.id, workspace_id: workspaceId } },
      });
      expect(membership?.role).toBe('OWNER');
    });
    it('allows admin to create workspace for another user (user is OWNER)', async () => {
      const uniqueSlug = `e2e-admin-other-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ name: 'Other User Workspace', slug: uniqueSlug, owner_id: user.id })
        .expect(201);
      expect(res.body.slug).toBe(uniqueSlug);
      createdWorkspaceIds.push(res.body.id);
      // Check membership
      const userMembership = await prisma.userWorkspace.findUnique({
        where: { user_id_workspace_id: { user_id: user.id, workspace_id: res.body.id } },
      });
      expect(userMembership?.role).toBe('OWNER');
    });
    it('forbids non-admin from creating workspace', async () => {
      await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Should Fail', slug: `fail-${Date.now()}` })
        .expect(403);
    });
    it('returns 400 for invalid payload', async () => {
      await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({})
        .expect(400);
    });
    it('creates workspace with duplicate slug (should append random suffix)', async () => {
      const uniqueSlug = `e2e-admin-dup-${Date.now()}`;
      // First creation
      const res1 = await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ name: 'Dup Slug', slug: uniqueSlug, owner_id: admin.id })
        .expect(201);
      createdWorkspaceIds.push(res1.body.id);
      // Second creation with same slug
      const res2 = await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ name: 'Dup Slug 2', slug: uniqueSlug, owner_id: admin.id })
        .expect(201);
      createdWorkspaceIds.push(res2.body.id);
      expect(res2.body.slug).not.toBe(uniqueSlug);
      expect(res2.body.slug.startsWith(uniqueSlug)).toBe(true);
    });
    it('rejects non alphanumeric slug', async () => {
      const weirdSlug = 'My Workspace!@#';
      const res = await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ name: 'Slugify Test', slug: weirdSlug, owner_id: admin.id })
        .expect(400);
      createdWorkspaceIds.push(res.body.id);
    });
    it('returns 400 for empty slug', async () => {
      await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ name: 'No Slug', slug: '', owner_id: admin.id })
        .expect(400);
    });
  });

  describe('POST /workspaces/user (user only)', () => {
    it('allows user to create workspace with unique slug', async () => {
      const uniqueSlug = `e2e-user-own-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/workspaces/user')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'User Workspace', slug: uniqueSlug, owner_id: user.id })
        .expect(201);
      createdWorkspaceIds.push(res.body.id);
      expect(res.body.slug).toBe(uniqueSlug);
      // Check membership
      const membership = await prisma.userWorkspace.findUnique({
        where: { user_id_workspace_id: { user_id: user.id, workspace_id: res.body.id } },
      });
      expect(membership?.role).toBe('OWNER');
    });
    it('forbids unauthenticated user', async () => {
      await request(app.getHttpServer())
        .post('/workspaces/user')
        .send({ name: 'Should Fail', slug: `fail-${Date.now()}` })
        .expect(401);
    });
    it('returns 400 for invalid payload', async () => {
      await request(app.getHttpServer())
        .post('/workspaces/user')
        .set('Authorization', `Bearer ${user.token}`)
        .send({})
        .expect(400);
    });
    it('creates workspace with duplicate slug (should append random suffix)', async () => {
      const uniqueSlug = `e2e-user-dup-${Date.now()}`;
      // First creation
      const res1 = await request(app.getHttpServer())
        .post('/workspaces/user')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Dup Slug', slug: uniqueSlug, owner_id: user.id })
        .expect(201);
      createdWorkspaceIds.push(res1.body.id);
      // Second creation with same slug
      const res2 = await request(app.getHttpServer())
        .post('/workspaces/user')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Dup Slug 2', slug: uniqueSlug, owner_id: user.id })
        .expect(201);
      createdWorkspaceIds.push(res2.body.id);
      expect(res2.body.slug).not.toBe(uniqueSlug);
      expect(res2.body.slug.startsWith(uniqueSlug)).toBe(true);
    });
    it('rejects non alphanumeric slug', async () => {
      const weirdSlug = 'User Workspace!@#';
      const res = await request(app.getHttpServer())
        .post('/workspaces/user')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Slugify Test', slug: weirdSlug, owner_id: user.id })
        .expect(400);
      createdWorkspaceIds.push(res.body.id);
    });
    it('returns 400 for empty slug', async () => {
      await request(app.getHttpServer())
        .post('/workspaces/user')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'No Slug', slug: '', owner_id: user.id })
        .expect(400);
    });
  });
});
