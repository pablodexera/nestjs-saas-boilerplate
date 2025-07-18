// IMPORTANT: Never modify or delete seeded workspaces or memberships in tests.
// Only add seeded users to test-created workspaces, never the reverse.
// All destructive operations must be scoped to test-created workspaces only.
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[WorkspacesE2E] GET /workspaces and /workspaces/user', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: any;
  let user: any;
  const workspaceIds: string[] = [];

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
    // Create workspaces for admin and user
    for (let i = 0; i < 2; i++) {
      const res = await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          name: 'List Workspaces',
          slug: `e2e-list-admin-${i}-${Date.now()}`,
          owner_id: admin.id,
        });
      if (!res.body || !res.body.id)
        throw new Error('workspace creation failed: ' + JSON.stringify(res.body));
      workspaceIds.push(res.body.id);
    }
    for (let i = 0; i < 2; i++) {
      const res = await request(app.getHttpServer())
        .post('/workspaces/user')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: `User Workspace ${i}`,
          slug: `e2e-list-user-${i}-${Date.now()}`,
          owner_id: user.id,
        });
      workspaceIds.push(res.body.id);
    }
  });

  afterAll(async () => {
    for (const id of workspaceIds) {
      if (id) {
        await prisma.subscription.deleteMany({ where: { workspace_id: id } });
        await prisma.userWorkspace.deleteMany({ where: { workspace_id: id } });
        await prisma.workspace.delete({ where: { id } }).catch(() => {});
      }
    }
    await prisma.$disconnect();
    await app.close();
  });

  describe('GET /workspaces (admin only)', () => {
    it('allows admin to list all workspaces', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspaces')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
    it('forbids non-admin from listing all workspaces', async () => {
      await request(app.getHttpServer())
        .get('/workspaces')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(403);
    });
    it('returns 401 for unauthenticated user', async () => {
      await request(app.getHttpServer()).get('/workspaces').expect(401);
    });
  });

  describe('GET /workspaces/user (authenticated user)', () => {
    it('allows user to list their workspaces', async () => {
      const res = await request(app.getHttpServer())
        .get('/workspaces/user')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Should include at least the two created for user
      const userWorkspaceIds = res.body.map((ws: any) => ws.id);
      expect(userWorkspaceIds).toEqual(expect.arrayContaining(workspaceIds.slice(2, 4)));
    });
    it('forbids unauthenticated user', async () => {
      await request(app.getHttpServer()).get('/workspaces/user').expect(401);
    });
  });
});
