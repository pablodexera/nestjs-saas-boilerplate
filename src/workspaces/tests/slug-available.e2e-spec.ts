// IMPORTANT: Never modify or delete seeded workspaces or memberships in tests.
// Only add seeded users to test-created workspaces, never the reverse.
// All destructive operations must be scoped to test-created workspaces only.
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[WorkspacesE2E] GET /workspaces/slug-available/:slug', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let user: any;
  let takenSlug: string | undefined;
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
    user = await getTestUserByEmail(process.env.SEED_USER_EMAIL!);
    // Create a workspace to take a slug
    takenSlug = `e2e-slug-taken-${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post('/workspaces/user')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Slug Taken', slug: takenSlug, owner_id: user.id });
    if (!res.body || !res.body.id)
      throw new Error('workspace creation failed: ' + JSON.stringify(res.body));
    workspaceId = res.body.id;
    if (!workspaceId) throw new Error('workspaceId not set');
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

  it('returns available: true for unused slug', async () => {
    const slug = `e2e-slug-available-${Date.now()}`;
    const res = await request(app.getHttpServer())
      .get(`/workspaces/slug-available/${slug}`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(res.body.available).toBe(true);
  });
  it('returns available: false for taken slug', async () => {
    const res = await request(app.getHttpServer())
      .get(`/workspaces/slug-available/${takenSlug}`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(res.body.available).toBe(false);
  });
  it('forbids unauthenticated user', async () => {
    const slug = `e2e-slug-unauth-${Date.now()}`;
    await request(app.getHttpServer()).get(`/workspaces/slug-available/${slug}`).expect(401);
  });
});
