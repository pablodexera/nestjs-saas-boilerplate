// src/common/filters/http-exception.filter.ts

import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine error type and status
    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let error: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const errObj = exceptionResponse as Record<string, unknown>;
        message = (errObj.message as string) || exceptionResponse;
        error = errObj.error as string | undefined;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // Log error details
    this.logger.error('[HttpExceptionFilter] Request error: %o', {
      path: request.url,
      method: request.method,
      status,
      message,
      error,
      user: request.user ? ((request.user as Record<string, unknown>).id as string) : undefined,
      ip: request.ip,
      stack: exception instanceof Error && exception.stack ? exception.stack : undefined,
    });

    // Build error response
    response.status(status).json({
      statusCode: status,
      path: request.url,
      method: request.method,
      message,
      error,
      timestamp: new Date().toISOString(),
      requestId: (request as any).id as string | undefined, // for traceability if present
    });
  }
}
