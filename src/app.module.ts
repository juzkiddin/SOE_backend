// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OtpModule } from './otp/otp.module';
import { PrismaModule } from './prisma/prisma.module';
import { RateLimitingService } from './rate-limiting/rate-limiting.service';
import { RateLimitingModule } from './rate-limiting/rate-limiting.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available globally
    }),
    PrismaModule,
    OtpModule,
    RateLimitingModule,
  ],
  providers: [RateLimitingService],
})
export class AppModule { }