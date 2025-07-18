import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

export interface IStorageAdapter {
  save(
    file: Express.Multer.File,
    workspaceId: string,
    userId: string,
  ): Promise<{ filePath: string; url: string }>;
  getStream(filePath: string): Promise<NodeJS.ReadableStream>;
  delete(filePath: string): Promise<void>;
}

@Injectable()
export class LocalStorage implements IStorageAdapter {
  private readonly uploadDir = path.resolve(__dirname, '../../../../uploads');
  private readonly appName = process.env.APP_NAME || 'app';

  constructor() {
    // Ensure base upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    const appDir = path.join(this.uploadDir, this.appName, 'files');
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }
  }

  async save(
    file: Express.Multer.File,
    workspaceId: string,
    _userId: string,
  ): Promise<{ filePath: string; url: string }> {
    const workspacePath = path.join(this.uploadDir, this.appName, 'files', workspaceId);
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
    }

    const filePath = path.join(workspacePath, `${Date.now()}_${file.originalname}`);
    try {
      fs.writeFileSync(filePath, file.buffer);
    } catch (err) {
      const error = err as Error;
      throw new InternalServerErrorException(`Failed to save file locally: ${error.message}`);
    }

    // For local dev, serve files from `/uploads` statically (set up in main.ts or server)
    const url = `/uploads/${this.appName}/files/${workspaceId}/${path.basename(filePath)}`;

    return { filePath, url };
  }

  async getStream(filePath: string): Promise<Readable> {
    if (!fs.existsSync(filePath)) {
      throw new InternalServerErrorException('File not found on disk');
    }
    return fs.createReadStream(filePath);
  }

  async delete(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      const error = err as Error;
      throw new InternalServerErrorException(`Failed to delete file locally: ${error.message}`);
    }
  }
}
