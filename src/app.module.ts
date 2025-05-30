// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OtpModule } from './otp/otp.module';
import { PrismaModule } from './prisma/prisma.module';
import { RateLimitingModule } from './rate-limiting/rate-limiting.module';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
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
        ],
      }),
    }),
    PrismaModule,
    OtpModule,
    RateLimitingModule,
  ],
})
export class AppModule { }