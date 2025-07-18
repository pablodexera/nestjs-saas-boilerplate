import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import { PinoLogger } from 'nestjs-pino';

import { PrismaService } from '../prisma/prisma.service';
import { StorageFactory } from './storage/storage.factory';
import { LocalStorage } from './storage/local.storage';
import { S3Storage } from './storage/s3.storage';
import { FileEntity } from './files.entity';

interface UploadFileInput {
  file: Express.Multer.File;
  userId: string;
  workspaceId: string;
}

interface ListFilesInput {
  workspaceId: string;
  userId: string;
  limit: number;
}

interface GetDownloadStreamInput {
  workspaceId: string;
  fileId: string;
  userId: string;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageFactory: StorageFactory,
    private readonly logger: PinoLogger,
  ) {}

  async uploadFile({ file, userId, workspaceId }: UploadFileInput): Promise<FileEntity> {
    if (!userId) throw new BadRequestException('User ID is required');
    if (!workspaceId) throw new BadRequestException('Workspace ID is required');
    // Select storage adapter by env/config
    const storage = this.storageFactory.get();
    // Save file
    const { filePath, url } = await storage.save(file, workspaceId, userId);

    // Write to DB
    const dbFile = await this.prisma.file.create({
      data: {
        user_id: userId,
        workspace_id: workspaceId,
        file_name: file.originalname,
        file_path: filePath,
        url,
        mime_type: file.mimetype,
        size_bytes: file.size,
        metadata: {},
      },
    });

    this.logger.info('File DB row created: %o', {
      event: 'file.db.created',
      userId,
      workspaceId,
      fileId: dbFile.id,
      fileName: dbFile.file_name,
      storagePath: filePath,
    });

    return dbFile;
  }

  async listFiles({ workspaceId, userId, limit }: ListFilesInput): Promise<FileEntity[]> {
    // Only list files in user's workspace
    const files = await this.prisma.file.findMany({
      where: { workspace_id: workspaceId, user_id: userId },
      orderBy: { uploaded_at: 'desc' },
      take: limit,
    });

    this.logger.info('Files listed: %o', {
      event: 'file.listed',
      userId,
      workspaceId,
      count: files.length,
    });

    return files;
  }

  async getDownloadStream({ workspaceId, fileId, userId }: GetDownloadStreamInput): Promise<{
    stream: NodeJS.ReadableStream;
    fileName: string;
    mimeType: string | null;
  }> {
    // Get file from DB
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });
    if (!file) {
      this.logger.error('File not found: %o', { fileId, userId, workspaceId });
      throw new NotFoundException('File not found');
    }
    if (file.workspace_id !== workspaceId || file.user_id !== userId) {
      this.logger.warn('Unauthorized file access attempt: %o', { fileId, userId, workspaceId });
      throw new ForbiddenException('Unauthorized');
    }

    // Get storage adapter
    const storage = this.storageFactory.get();
    const stream = await storage.getStream(file.file_path);

    this.logger.info('Download stream ready: %o', {
      event: 'file.download.ready',
      userId,
      workspaceId,
      fileId,
      fileName: file.file_name,
    });

    return {
      stream,
      fileName: file.file_name,
      mimeType: file.mime_type,
    };
  }

  async deleteFile({
    workspaceId,
    fileId,
    userId,
  }: {
    workspaceId: string;
    fileId: string;
    userId: string;
  }): Promise<void> {
    // Fetch file from DB
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) {
      this.logger.warn('File delete failed: not found %o', { fileId, userId, workspaceId });
      throw new NotFoundException('File not found');
    }
    // Check workspace match
    if (file.workspace_id !== workspaceId) {
      this.logger.warn('File delete forbidden: workspace mismatch %o', {
        fileId,
        userId,
        workspaceId,
      });
      throw new ForbiddenException('File does not belong to this workspace');
    }

    // Delete from storage
    const storage = this.storageFactory.get();
    try {
      await storage.delete(file.file_path);
      this.logger.info('File deleted from storage: %o', {
        fileId,
        userId,
        workspaceId,
        filePath: file.file_path,
      });
    } catch (err) {
      const error = err as Error;
      this.logger.error('File storage delete failed: %o', {
        fileId,
        userId,
        workspaceId,
        error: error.message,
      });
      // Proceed to delete DB record anyway
    }
    // Delete from DB
    await this.prisma.file.delete({ where: { id: fileId } });
    this.logger.info('File DB row deleted: %o', { fileId, userId, workspaceId });
  }

  async ping(): Promise<{ status: string }> {
    const adapter = this.storageFactory.get();
    try {
      if (adapter instanceof S3Storage) {
        const s3 = (adapter as any as S3Storage)['s3'] as S3Client;
        const bucket = (adapter as any as S3Storage)['bucket'] as string;
        await s3.send(new HeadBucketCommand({ Bucket: bucket }));
      } else if (adapter instanceof LocalStorage) {
        const dir = (adapter as any as LocalStorage)['uploadDir'] as string;
        await fs.promises.access(dir, fs.constants.R_OK | fs.constants.W_OK);
      }
      return { status: 'ok' };
    } catch (err) {
      const error = err as Error;
      this.logger.error('Storage ping failed: %o', { error: error.message });
      throw error;
    }
  }
}
