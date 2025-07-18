import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[UserE2E] GET /users', () => {
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

  it('allows global admin to list all users', async () => {
    const res = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);

    // Check that all required fields are present
    for (const user of res.body) {
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('is_global_admin');
      expect(user).toHaveProperty('created_at');
      expect(user).toHaveProperty('updated_at');
    }
  });

  it('forbids workspace admin from listing all users', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${wsAdmin.token}`)
      .expect(403);
  });

  it('forbids regular member from listing all users', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${member.token}`)
      .expect(403);
  });

  it('returns 401 if no auth token is provided', async () => {
    await request(app.getHttpServer()).get('/users').expect(401);
  });
});
