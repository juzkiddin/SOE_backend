import { Module } from '@nestjs/common';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RateLimitingModule } from '../rate-limiting/rate-limiting.module';
import { CryptoService } from './crypto.service';
import { AuthService } from './auth.service';
import { SmsService } from './sms.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [PrismaModule, RateLimitingModule, CacheModule],
  controllers: [OtpController],
  providers: [
    OtpService,
    CryptoService,
    AuthService,
    SmsService,
  ],
})
export class OtpModule { }