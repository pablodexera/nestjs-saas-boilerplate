import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[UserE2E] PATCH /users/:id', () => {
  let app: INestApplication;
  let admin: any;
  let wsAdmin: any;
  let member: any;

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

  const newName = 'Temp Updated Name';
  const revertName = (user: any) => ({
    full_name: user.full_name || 'Seed User',
  });

  it('allows admin to update any user', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/users/${member.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ full_name: newName })
      .expect(200);

    expect(res.body.full_name).toBe(newName);

    // Cleanup: revert name
    await request(app.getHttpServer())
      .patch(`/users/${member.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send(revertName(member))
      .expect(200);
  });

  it('allows user to update their own profile', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/users/${member.id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ full_name: newName })
      .expect(200);

    expect(res.body.full_name).toBe(newName);

    // Cleanup: revert name
    await request(app.getHttpServer())
      .patch(`/users/${member.id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send(revertName(member))
      .expect(200);
  });

  it('forbids regular member from updating another user', async () => {
    await request(app.getHttpServer())
      .patch(`/users/${wsAdmin.id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ full_name: 'Should Not Work' })
      .expect(403);
  });

  it('returns 404 for non-existent user', async () => {
    await request(app.getHttpServer())
      .patch('/users/does-not-exist')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ full_name: 'No User' })
      .expect(404);
  });

  it('returns 401 if no auth token is provided', async () => {
    await request(app.getHttpServer())
      .patch(`/users/${admin.id}`)
      .send({ full_name: 'No Auth' })
      .expect(401);
  });

  it('rejects invalid payloads', async () => {
    await request(app.getHttpServer())
      .patch(`/users/${member.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ is_global_admin: 'not-a-boolean' })
      .expect(400);
  });
});
