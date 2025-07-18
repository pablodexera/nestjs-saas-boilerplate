import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { StorageFactory } from './storage/storage.factory';
import { LocalStorage } from './storage/local.storage';
import { S3Storage } from './storage/s3.storage';
import { PrismaService } from '../prisma/prisma.service';
import { UsersModule } from '../users/users.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [LoggerModule, UsersModule, WorkspacesModule],
  controllers: [FilesController],
  providers: [FilesService, StorageFactory, LocalStorage, S3Storage, PrismaService],
  exports: [FilesService],
})
export class FilesModule {}
