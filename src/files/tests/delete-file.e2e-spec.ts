import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as path from 'path';
import * as fs from 'fs';

import { AppModule } from '../../app.module';
import { getTestUserByEmail } from '../../../test/test-utils';

describe('[FileE2E] DELETE /workspaces/:workspaceId/files/:fileId', () => {
  let app: INestApplication;
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

    member = await getTestUserByEmail(process.env.SEED_USER_EMAIL!);
    workspaceId = process.env.SEED_WORKSPACE_ID!;

    // Upload a file for deletion
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
    await app.close();
  });

  it('allows workspace member to delete their file', async () => {
    await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}/files/${uploadedFileId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(204);

    // Confirm file is gone
    await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/files/${uploadedFileId}/download`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(404);
  });

  it('forbids delete without auth', async () => {
    // Re-upload for this test
    const testFilePath = path.join(__dirname, 'testfile.txt');
    fs.writeFileSync(testFilePath, 'test content');
    const res = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/files/upload`)
      .set('Authorization', `Bearer ${member.token}`)
      .attach('file', testFilePath);
    const tempFileId = res.body.id;
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}/files/${tempFileId}`)
      .expect(401);

    // Cleanup
    await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}/files/${tempFileId}`)
      .set('Authorization', `Bearer ${member.token}`);
  });

  it('returns 404 for non-existent file', async () => {
    await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}/files/does-not-exist`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(404);
  });
});
