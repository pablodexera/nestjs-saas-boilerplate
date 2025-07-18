import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[NotificationsE2E] GET /notifications', () => {
  let app: INestApplication;
  let member: any;
  let admin: any;
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
    member = await getTestUserByEmail(process.env.SEED_USER_EMAIL!);
    admin = await getTestUserByEmail(process.env.SEED_ADMIN_EMAIL!);
  });

  afterAll(async () => {
    if (notificationId) {
      const prisma = new PrismaClient();
      await prisma.notification.delete({ where: { id: notificationId } }).catch(() => {});
      await prisma.$disconnect();
    }
    await app.close();
  });

  it('lists notifications for the user', async () => {
    const res = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('lists notifications for admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('filters unread notifications', async () => {
    const res = await request(app.getHttpServer())
      .get('/notifications?unreadOnly=true')
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 401 if no auth token is provided', async () => {
    await request(app.getHttpServer()).get('/notifications').expect(401);
  });
});
