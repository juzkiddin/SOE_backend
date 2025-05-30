// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OtpModule } from './otp/otp.module';
import { PrismaModule } from './prisma/prisma.module';
import { RateLimitingModule } from './rate-limiting/rate-limiting.module';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { CacheModule } from './cache/cache.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => ({
        throttlers: [
          {
            ttl: 30000, // 30 seconds in milliseconds
            limit: config.get('otp.maxAttempts', 5),
          },
          {
            ttl: 3600000, // 1 hour in milliseconds
            limit: config.get('api.rateLimit', 1000), // Higher limit for API-wide rate limiting
          }
        ],
      }),
    }),
    PrismaModule,
    CacheModule,
    OtpModule,
    RateLimitingModule,
  ],
})
export class AppModule { }