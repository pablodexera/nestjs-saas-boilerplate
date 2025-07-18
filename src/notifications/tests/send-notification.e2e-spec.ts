import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[NotificationsE2E] POST /notifications/admin/send', () => {
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
  });

  afterAll(async () => {
    if (notificationId) {
      const prisma = new PrismaClient();
      await prisma.notification.delete({ where: { id: notificationId } }).catch(() => {});
      await prisma.$disconnect();
    }
    await app.close();
  });

  it('allows admin to send a notification to a user (existing template)', async () => {
    const res = await request(app.getHttpServer())
      .post('/notifications/admin/send')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        user_id: member.id,
        type: 'welcome', // existing template
        payload: { fullName: member.email },
        sent_via: 'email',
        toEmail: member.email,
      })
      .expect(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.user_id).toBe(member.id);
    notificationId = res.body.id;
  });

  it('throws error for missing Handlebars template', async () => {
    const res = await request(app.getHttpServer())
      .post('/notifications/admin/send')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        user_id: member.id,
        type: 'nonexistent-template',
        payload: { foo: 'bar' },
        sent_via: 'email',
        toEmail: member.email,
      });
    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/Email template not found/);
  });

  it('forbids non-admins from sending notifications', async () => {
    await request(app.getHttpServer())
      .post('/notifications/admin/send')
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        user_id: member.id,
        type: 'test-e2e',
        payload: { foo: 'bar' },
        sent_via: 'email',
        toEmail: member.email,
      })
      .expect(403);
  });

  it('returns 401 if no auth token is provided', async () => {
    await request(app.getHttpServer())
      .post('/notifications/admin/send')
      .send({
        user_id: member.id,
        type: 'test-e2e',
        payload: { foo: 'bar' },
        sent_via: 'email',
        toEmail: member.email,
      })
      .expect(401);
  });
});
