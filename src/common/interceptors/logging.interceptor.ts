// src/common/interceptors/logging.interceptor.ts

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const requestId = uuidv4();

    // Attach requestId for traceability
    req.id = requestId;

    const { method, originalUrl, user } = req;
    const userId = user ? user.id : undefined;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: (_responseBody) => {
          const duration = Date.now() - start;
          this.logger.info(
            {
              requestId,
              method,
              url: originalUrl,
              userId,
              status: req.res?.statusCode,
              duration,
            },
            `Request completed`,
          );
        },
        error: (err) => {
          const duration = Date.now() - start;
          const error = err as Error;
          this.logger.error(
            {
              requestId,
              method,
              url: originalUrl,
              userId,
              status: req.res?.statusCode,
              duration,
              error: error.message,
            },
            'Request failed: %o',
            { error: error.message },
          );
        },
      }),
    );
  }
}
