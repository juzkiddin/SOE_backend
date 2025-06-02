// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OtpModule } from './otp/otp.module';
import { PrismaModule } from './prisma/prisma.module';
import { RateLimitingModule } from './rate-limiting/rate-limiting.module';
import { CacheModule } from './cache/cache.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    CacheModule,
    OtpModule,
    RateLimitingModule,
  ],
})
export class AppModule { }