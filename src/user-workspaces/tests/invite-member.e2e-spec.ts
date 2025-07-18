// IMPORTANT: Never modify or delete seeded users in tests. Users are managed by Clerk.
// Only use seeded users for all user actions. All destructive operations must be scoped to test-created workspaces only.
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[UserWorkspacesE2E] POST /user-workspaces/:workspaceId/members (invite)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: any;
  let member: any;
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
    member = await getTestUserByEmail(process.env.SEED_USER_EMAIL!);
    outsider = await getTestUserByEmail(process.env.SEED_WORKSPACE_ADMIN_EMAIL!);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Create a new workspace for each test
    const uniqueSlug = `e2e-invite-member-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const res = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Invite Member Workspace', slug: uniqueSlug, owner_id: admin.id });
    if (!res.body || !res.body.id)
      throw new Error('workspace creation failed: ' + JSON.stringify(res.body));
    workspaceId = res.body.id;
    if (!workspaceId) throw new Error('workspaceId not set');
    // Add member as MEMBER
    await prisma.userWorkspace.upsert({
      where: { user_id_workspace_id: { user_id: member.id, workspace_id: workspaceId! } },
      update: { status: 'active', role: 'MEMBER' },
      create: {
        user_id: member.id,
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

  it('allows OWNER to invite a seeded user', async () => {
    const res = await request(app.getHttpServer())
      .post(`/user-workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: outsider.email })
      .expect(201);
    expect(res.body.status).toBe('pending');
  });

  it('inviting a non-existent user (valid email) does not throw and does not create membership', async () => {
    const nonExistentEmail = `nouser+${Date.now()}@danila.ai`;
    const res = await request(app.getHttpServer())
      .post(`/user-workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: nonExistentEmail })
      .expect(201);
    expect(res.body).toEqual({});
    const membership = await prisma.userWorkspace.findFirst({
      where: { workspace_id: workspaceId!, user: { email: nonExistentEmail } },
    });
    expect(membership).toBeNull();
  });

  it('forbids MEMBER from inviting', async () => {
    await request(app.getHttpServer())
      .post(`/user-workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ email: outsider.email })
      .expect(403);
  });

  it('forbids non-member from inviting', async () => {
    await request(app.getHttpServer())
      .post(`/user-workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ email: member.email })
      .expect(403);
  });

  it('returns 401 for unauthenticated user', async () => {
    await request(app.getHttpServer())
      .post(`/user-workspaces/${workspaceId}/members`)
      .send({ email: member.email })
      .expect(401);
  });

  it('returns 400 for duplicate invite', async () => {
    // Invite once
    await request(app.getHttpServer())
      .post(`/user-workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: outsider.email })
      .expect(201);
    // Try to invite the same user again
    await request(app.getHttpServer())
      .post(`/user-workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: outsider.email })
      .expect(400);
  });
});
