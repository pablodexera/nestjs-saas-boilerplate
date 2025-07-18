import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as path from 'path';
import * as fs from 'fs';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[FileE2E] GET /workspaces/:workspaceId/files', () => {
  let app: INestApplication;
  let admin: any;
  let member: any;
  let workspaceId: string;
  let uploadedFileId: string | undefined;

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
    member = await getTestUserByEmail(process.env.SEED_USER_EMAIL!);
    workspaceId = process.env.SEED_WORKSPACE_ID!;

    // Upload a file for listing
    const testFilePath = path.join(__dirname, 'testfile.txt');
    fs.writeFileSync(testFilePath, 'test content');
    const res = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/files/upload`)
      .set('Authorization', `Bearer ${member.token}`)
      .attach('file', testFilePath);
    uploadedFileId = res.body.id;
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  afterAll(async () => {
    // Cleanup: delete uploaded file if present
    if (uploadedFileId) {
      try {
        await request(app.getHttpServer())
          .delete(`/workspaces/${workspaceId}/files/${uploadedFileId}`)
          .set('Authorization', `Bearer ${admin.token}`);
      } catch {
        // ignore
      }
    }
    await app.close();
  });

  it('allows workspace member to list files', async () => {
    const res = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/files`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('file_name');
  });

  it('forbids listing files without auth', async () => {
    await request(app.getHttpServer()).get(`/workspaces/${workspaceId}/files`).expect(401);
  });
});
