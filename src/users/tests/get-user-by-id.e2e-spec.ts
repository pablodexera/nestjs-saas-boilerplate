import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[UserE2E] GET /users/:id', () => {
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

  it('allows admin to fetch any user profile', async () => {
    const res = await request(app.getHttpServer())
      .get(`/users/${member.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(res.body.id).toBe(member.id);
    expect(res.body.email).toBe(member.email);
  });

  it('allows user to fetch their own profile', async () => {
    const res = await request(app.getHttpServer())
      .get(`/users/${member.id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);

    expect(res.body.id).toBe(member.id);
    expect(res.body.email).toBe(member.email);
  });

  it('forbids regular member from fetching another user profile', async () => {
    await request(app.getHttpServer())
      .get(`/users/${wsAdmin.id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(403);
  });

  it('returns 404 for non-existent user', async () => {
    await request(app.getHttpServer())
      .get('/users/does-not-exist')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(404);
  });

  it('returns 401 if no auth token is provided', async () => {
    await request(app.getHttpServer()).get(`/users/${admin.id}`).expect(401);
  });
});
