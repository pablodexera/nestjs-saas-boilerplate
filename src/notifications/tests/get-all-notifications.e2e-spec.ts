import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[NotificationsE2E] GET /notifications/admin/all', () => {
  let app: INestApplication;
  let admin: any;
  let wsAdmin: any;
  let member: any;
  let notificationId: string | undefined;

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
    admin = await getTestUserByEmail(process.env.SEED_ADMIN_EMAIL!);
    wsAdmin = await getTestUserByEmail(process.env.SEED_WORKSPACE_ADMIN_EMAIL!);
    member = await getTestUserByEmail(process.env.SEED_USER_EMAIL!);
  });

  afterAll(async () => {
    if (notificationId) {
      const prisma = new PrismaClient();
      await prisma.notification.delete({ where: { id: notificationId } }).catch(() => {});
      await prisma.$disconnect();
    }
    await app.close();
  });

  it('allows admin to list all notifications', async () => {
    const res = await request(app.getHttpServer())
      .get('/notifications/admin/all')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('forbids non-admins from listing all notifications', async () => {
    await request(app.getHttpServer())
      .get('/notifications/admin/all')
      .set('Authorization', `Bearer ${wsAdmin.token}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/notifications/admin/all')
      .set('Authorization', `Bearer ${member.token}`)
      .expect(403);
  });

  it('returns 401 if no auth token is provided', async () => {
    await request(app.getHttpServer()).get('/notifications/admin/all').expect(401);
  });
});
