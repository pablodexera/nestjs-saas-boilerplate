import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[UserE2E] DELETE /users/:id', () => {
  let app: INestApplication;
  let admin: any;
  let wsAdmin: any;
  let member: any;
  let tempUser: any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
    await app.close();
  });

  // Helper to create a temp user via the API (must be admin)
  const createTempUser = async () => {
    const email = `temp${Date.now()}@example.com`;
    const res = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        id: `temp-${Date.now()}`,
        email,
        full_name: 'Temp User',
        is_global_admin: false,
        is_disabled: false,
      })
      .expect(201);
    return res.body;
  };

  afterEach(async () => {
    // Cleanup: ensure temp user is deleted if it exists
    if (tempUser) {
      try {
        await request(app.getHttpServer())
          .delete(`/users/${tempUser.id}`)
          .set('Authorization', `Bearer ${admin.token}`);
      } catch {
        // ignore
      }
      tempUser = undefined;
    }
  });

  it('allows admin to delete a user', async () => {
    tempUser = await createTempUser();

    await request(app.getHttpServer())
      .delete(`/users/${tempUser.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(204);

    // Confirm user is gone
    await request(app.getHttpServer())
      .get(`/users/${tempUser.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(404);
  });

  it('forbids workspace admin from deleting a user', async () => {
    tempUser = await createTempUser();

    await request(app.getHttpServer())
      .delete(`/users/${tempUser.id}`)
      .set('Authorization', `Bearer ${wsAdmin.token}`)
      .expect(403);
  });

  it('forbids regular member from deleting a user', async () => {
    tempUser = await createTempUser();

    await request(app.getHttpServer())
      .delete(`/users/${tempUser.id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(403);
  });

  it('returns 404 for non-existent user', async () => {
    await request(app.getHttpServer())
      .delete('/users/does-not-exist')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(404);
  });

  it('returns 401 if no auth token is provided', async () => {
    tempUser = await createTempUser();

    await request(app.getHttpServer()).delete(`/users/${tempUser.id}`).expect(401);
  });
});
