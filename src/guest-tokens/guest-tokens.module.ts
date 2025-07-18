import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { GuestTokensController } from './guest-tokens.controller';
import { GuestTokensService } from './guest-tokens.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [GuestTokensController],
  providers: [GuestTokensService],
  exports: [GuestTokensService],
})
export class GuestTokensModule {}
