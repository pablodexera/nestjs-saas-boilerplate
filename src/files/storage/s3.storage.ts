import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

import { IStorageAdapter } from './local.storage';

@Injectable()
export class S3Storage implements IStorageAdapter {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly appName: string;

  constructor() {
    this.bucket = process.env.AWS_S3_BUCKET!;
    this.region = process.env.AWS_S3_REGION || 'us-east-1';
    this.appName = process.env.APP_NAME || 'app';
    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async save(
    file: Express.Multer.File,
    workspaceId: string,
    _userId: string,
  ): Promise<{ filePath: string; url: string }> {
    const key = `${this.appName}/files/${workspaceId}/${Date.now()}_${file.originalname}`;
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
      const url = await getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn: 3600 },
      );
      return { filePath: key, url };
    } catch (err) {
      const error = err as Error;
      throw new InternalServerErrorException(`Failed to upload file to S3: ${error.message}`);
    }
  }

  async getStream(filePath: string): Promise<NodeJS.ReadableStream> {
    try {
      const { Body } = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: filePath,
        }),
      );
      if (!Body || !(Body as any).pipe) {
        throw new Error('Invalid S3 response body');
      }
      return Body as Readable;
    } catch (err) {
      const error = err as Error;
      throw new InternalServerErrorException(`Failed to get file from S3: ${error.message}`);
    }
  }

  async delete(filePath: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: filePath,
        }),
      );
    } catch (err) {
      const error = err as Error;
      throw new InternalServerErrorException(`Failed to delete file from S3: ${error.message}`);
    }
  }
}
