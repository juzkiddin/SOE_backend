import { Module } from '@nestjs/common';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RateLimitingModule } from '../rate-limiting/rate-limiting.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CryptoService } from './crypto.service';
import { AuthService } from './auth.service';

@Module({
  imports: [PrismaModule, RateLimitingModule],
  controllers: [OtpController],
  providers: [
    OtpService,
    CryptoService,
    AuthService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class OtpModule { }