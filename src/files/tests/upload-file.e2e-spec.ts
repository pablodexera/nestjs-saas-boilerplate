import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as path from 'path';
import * as fs from 'fs';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[FileE2E] POST /workspaces/:workspaceId/files/upload', () => {
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
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Cleanup: delete uploaded file if present
    if (uploadedFileId) {
      try {
        await request(app.getHttpServer())
          .delete(`/workspaces/${workspaceId}/files/${uploadedFileId}`)
          .set('Authorization', `Bearer ${admin.token}`);
      } catch {
        // ignore
      }
      uploadedFileId = undefined;
    }
  });

  it('allows workspace member to upload a file', async () => {
    const testFilePath = path.join(__dirname, 'testfile.txt');
    fs.writeFileSync(testFilePath, 'test content');

    const res = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/files/upload`)
      .set('Authorization', `Bearer ${member.token}`)
      .attach('file', testFilePath)
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.file_name).toBe('testfile.txt');
    expect(res.body.workspace_id).toBe(workspaceId);

    uploadedFileId = res.body.id;

    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('forbids upload without auth', async () => {
    const testFilePath = path.join(__dirname, 'testfile.txt');
    fs.writeFileSync(testFilePath, 'test content');

    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/files/upload`)
      .attach('file', testFilePath)
      .expect(401);

    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('rejects upload with no file', async () => {
    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/files/upload`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(400);
  });
});
