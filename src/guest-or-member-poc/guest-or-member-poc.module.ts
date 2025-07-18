import { Module } from '@nestjs/common';

import { GuestOrMemberPocController } from './guest-or-member-poc.controller';
import { GuestOrMemberPocService } from './guest-or-member-poc.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [GuestOrMemberPocController],
  providers: [GuestOrMemberPocService],
})
export class GuestOrMemberPocModule {}
