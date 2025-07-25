// src/common/guards/clerk-auth.guard.ts

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ClerkAuthGuard extends AuthGuard('clerk') {}
