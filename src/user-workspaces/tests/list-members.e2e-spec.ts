// IMPORTANT: Never modify or delete seeded workspaces or memberships in tests.
// Only add seeded users to test-created workspaces, never the reverse.
// All destructive operations must be scoped to test-created workspaces only.
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[UserWorkspacesE2E] GET /workspaces/:workspaceId/members', () => {
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
    const uniqueSlug = `e2e-list-members-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const res = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'List Members Workspace', slug: uniqueSlug, owner_id: admin.id });
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

  it('allows OWNER to list members', async () => {
    const res = await request(app.getHttpServer())
      .get(`/user-workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('forbids MEMBER from listing members', async () => {
    await request(app.getHttpServer())
      .get(`/user-workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(403);
  });

  it('forbids non-member from listing members', async () => {
    await request(app.getHttpServer())
      .get(`/user-workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(403);
  });

  it('returns 401 for unauthenticated user', async () => {
    await request(app.getHttpServer()).get(`/user-workspaces/${workspaceId}/members`).expect(401);
  });

  it('OWNER can list all statuses (pending, removed, active)', async () => {
    // Invite outsider (pending)
    const inviteRes = await request(app.getHttpServer())
      .post(`/user-workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: outsider.email });
    expect(inviteRes.body.status).toBe('pending');
    // Remove member to create a 'removed' status
    await prisma.userWorkspace.update({
      where: { user_id_workspace_id: { user_id: user.id, workspace_id: workspaceId! } },
      data: { status: 'removed' },
    });
    // Admin is OWNER (active)
    const res = await request(app.getHttpServer())
      .get(`/user-workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    const statuses = res.body.map((m: any) => m.status);
    expect(statuses).toContain('pending'); // outsider
    expect(statuses).toContain('removed'); // member
    expect(statuses).toContain('active'); // admin
  });
});
