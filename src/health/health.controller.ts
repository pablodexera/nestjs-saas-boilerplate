import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';

import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('healthz')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly logger: PinoLogger,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness/Readiness health check for infra and dependencies' })
  @ApiResponse({
    status: 200,
    description: 'Health check result',
    schema: {
      example: {
        db: true,
        email: true,
        storage: true,
        status: 'ok',
        timestamp: '2025-07-07T13:00:00Z',
      },
    },
  })
  async getHealth() {
    const result = await this.healthService.check();
    this.logger.info('Health check result: %o', result);
    return result;
  }
}
