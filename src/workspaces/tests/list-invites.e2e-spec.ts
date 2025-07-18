import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[WorkspacesE2E] GET /workspaces/invites', () => {
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
    const uniqueSlug = `e2e-list-invites-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const res = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'List Invites Workspace', slug: uniqueSlug, owner_id: admin.id });
    workspaceId = res.body.id;
    // Remove all memberships for member and outsider, but keep the owner/admin
    await prisma.userWorkspace.deleteMany({
      where: {
        workspace_id: workspaceId,
        user_id: { in: [member.id, outsider.id] },
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

  it('returns empty array if user has no pending invites', async () => {
    const res = await request(app.getHttpServer())
      .get('/workspaces/invites')
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('returns 401 for unauthenticated user', async () => {
    await request(app.getHttpServer()).get('/workspaces/invites').expect(401);
  });

  it('shows only pending invites for the user', async () => {
    // Invite member and collect response
    await request(app.getHttpServer())
      .post(`/user-workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: member.email });

    // Invite outsider and collect response
    await request(app.getHttpServer())
      .post(`/user-workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: outsider.email });

    // Accept invite for outsider (should not show up)
    const outsiderInvite = await prisma.userWorkspace.findFirst({
      where: { workspace_id: workspaceId, user_id: outsider.id },
    });

    expect(outsiderInvite).toBeTruthy();
    if (outsiderInvite) {
      await prisma.userWorkspace.update({
        where: { user_id_workspace_id: { user_id: outsider.id, workspace_id: workspaceId! } },
        data: { status: 'active' },
      });
    }
    // Member should see only their own pending invite
    const res = await request(app.getHttpServer())
      .get('/workspaces/invites')
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].user_id).toBe(member.id);
    expect(res.body[0].status).toBe('pending');
  });

  it('does not show invites for other users', async () => {
    // Invite member only
    await request(app.getHttpServer())
      .post(`/user-workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: member.email });
    // Outsider should see no invites
    const res = await request(app.getHttpServer())
      .get('/workspaces/invites')
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });
});
