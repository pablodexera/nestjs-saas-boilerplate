import { Injectable } from '@nestjs/common';

import { LocalStorage, IStorageAdapter } from './local.storage';
import { S3Storage } from './s3.storage';

@Injectable()
export class StorageFactory {
  private readonly adapter: IStorageAdapter;

  constructor(
    private readonly local: LocalStorage,
    private readonly s3: S3Storage,
  ) {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.AWS_S3_BUCKET &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
    ) {
      this.adapter = this.s3;
    } else {
      this.adapter = this.local;
    }
  }

  get(): IStorageAdapter {
    return this.adapter;
  }
}
