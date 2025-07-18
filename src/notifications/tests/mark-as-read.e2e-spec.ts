import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[NotificationsE2E] PATCH /notifications/:id/read', () => {
  let app: INestApplication;
  let admin: any;
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
    member = await getTestUserByEmail(process.env.SEED_USER_EMAIL!);
    // Create a notification for the member
    const res = await request(app.getHttpServer())
      .post('/notifications/admin/send')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        user_id: member.id,
        type: 'welcome', // existing template
        payload: { fullName: member.email },
        sent_via: 'email',
        toEmail: member.email,
      });
    notificationId = res.body.id;
  });

  afterAll(async () => {
    if (notificationId) {
      const prisma = new PrismaClient();
      await prisma.notification.delete({ where: { id: notificationId } }).catch(() => {});
      await prisma.$disconnect();
    }
    // Cleanup logic if needed
    await app.close();
  });

  it('allows user to mark their notification as read', async () => {
    expect(notificationId).toBeTruthy();
    const res = await request(app.getHttpServer())
      .patch(`/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);
    expect(res.body.read_at).toBeDefined();
  });

  it('forbids other users from marking as read', async () => {
    expect(notificationId).toBeTruthy();
    await request(app.getHttpServer())
      .patch(`/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(404);
  });

  it('returns 401 if no auth token is provided', async () => {
    expect(notificationId).toBeTruthy();
    await request(app.getHttpServer()).patch(`/notifications/${notificationId}/read`).expect(401);
  });
});
