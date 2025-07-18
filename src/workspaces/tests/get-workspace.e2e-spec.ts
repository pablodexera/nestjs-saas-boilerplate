// IMPORTANT: Never modify or delete seeded workspaces or memberships in tests.
// Only add seeded users to test-created workspaces, never the reverse.
// All destructive operations must be scoped to test-created workspaces only.
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[WorkspacesE2E] GET /workspaces/:workspaceId', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: any;
  let user: any;
  let member: any;
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
    member = await getTestUserByEmail(process.env.SEED_WORKSPACE_ADMIN_EMAIL!);
    // Create a workspace as admin (OWNER)
    const uniqueSlug = `e2e-get-${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Get Workspace', slug: uniqueSlug, owner_id: admin.id });
    if (!res.body || !res.body.id)
      throw new Error('workspace creation failed: ' + JSON.stringify(res.body));
    workspaceId = res.body.id;
    expect(workspaceId).toBeDefined();
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
    if (workspaceId) {
      await prisma.subscription.deleteMany({ where: { workspace_id: workspaceId } });
      await prisma.userWorkspace.deleteMany({ where: { workspace_id: workspaceId } });
      await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
    }
    await prisma.$disconnect();
    await app.close();
  });

  it('allows OWNER to fetch workspace', async () => {
    const res = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    expect(res.body.id).toBe(workspaceId);
    expect(res.body.name).toBeDefined();
  });
  it('allows MEMBER to fetch workspace', async () => {
    const res = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(res.body.id).toBe(workspaceId);
  });
  it('forbids non-member from fetching workspace', async () => {
    await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(403);
  });
  it('returns 401 for unauthenticated user', async () => {
    await request(app.getHttpServer()).get(`/workspaces/${workspaceId}`).expect(401);
  });
  it('returns 404/403 for non-existent workspace', async () => {
    await request(app.getHttpServer())
      .get('/workspaces/does-not-exist')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect([403, 404]);
  });
});
