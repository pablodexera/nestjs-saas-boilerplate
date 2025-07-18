import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Req,
  Param,
  Get,
  Res,
  Query,
  BadRequestException,
  Delete,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { PinoLogger } from 'nestjs-pino';

import { WorkspaceMember } from '../common/decorators/workspace-member.decorator';
import { FilesService } from './files.service';

@ApiTags('Files')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly logger: PinoLogger,
  ) {}

  @Post('upload')
  @WorkspaceMember()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file to workspace (Workspace member only)' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'workspaceId', required: true })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadFile(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const userId = (req.user as any)?.['id'];
    if (!userId) {
      throw new BadRequestException('User ID not found');
    }
    const result = await this.filesService.uploadFile({
      file,
      userId,
      workspaceId,
    });

    this.logger.info(
      {
        event: 'file.uploaded',
        userId,
        workspaceId,
        fileId: result.id,
        fileName: file.originalname,
        size: file.size,
        storagePath: (result as any).file_path,
      },
      'File uploaded',
    );

    return result;
  }

  @Get()
  @WorkspaceMember()
  @ApiOperation({ summary: 'List files in a workspace (Workspace member only)' })
  @ApiParam({ name: 'workspaceId', required: true })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max number of files to return',
  })
  @ApiResponse({ status: 200, description: 'Array of files' })
  async listFiles(
    @Param('workspaceId') workspaceId: string,
    @Req() req: Request,
    @Query('limit') limit?: number,
  ) {
    const userId = (req.user as any)?.['id'];
    if (!userId) {
      throw new BadRequestException('User ID not found');
    }
    const files = await this.filesService.listFiles({
      workspaceId,
      userId,
      limit: limit || 50,
    });

    this.logger.info('File list retrieved: %o', {
      event: 'file.list',
      userId,
      workspaceId,
      count: files.length,
    });

    return files;
  }

  @Get(':fileId/download')
  @WorkspaceMember()
  @ApiOperation({ summary: 'Download a file (Workspace member only, secure)' })
  @ApiParam({ name: 'workspaceId', required: true })
  @ApiParam({ name: 'fileId', required: true })
  @ApiResponse({ status: 200, description: 'File stream' })
  async downloadFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req.user as any)?.['id'];
    if (!userId) {
      throw new BadRequestException('User ID not found');
    }
    try {
      const { stream, fileName, mimeType } = await this.filesService.getDownloadStream({
        workspaceId,
        fileId,
        userId,
      });

      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      if (mimeType) {
        res.setHeader('Content-Type', mimeType);
      }
      this.logger.info(
        { event: 'file.download', userId, workspaceId, fileId, fileName },
        'File download started',
      );
      stream.pipe(res);
    } catch (err) {
      const error = err as Error;
      this.logger.error('File download failed: %o', {
        event: 'file.download.error',
        userId,
        workspaceId,
        fileId,
        error: error.message,
      });
      throw error;
    }
  }

  @Delete(':fileId')
  @WorkspaceMember()
  @ApiOperation({ summary: 'Delete a file (Workspace member only, owner)' })
  @ApiParam({ name: 'workspaceId', required: true })
  @ApiParam({ name: 'fileId', required: true })
  @ApiResponse({ status: 204, description: 'File deleted successfully' })
  @HttpCode(204)
  async deleteFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Req() req: Request,
  ) {
    const userId = (req.user as any)?.['id'];
    if (!userId) {
      throw new BadRequestException('User ID not found');
    }
    await this.filesService.deleteFile({ workspaceId, fileId, userId });
    this.logger.info('File deleted: %o', { event: 'file.deleted', userId, workspaceId, fileId });
    // Return nothing for 204
  }
}
