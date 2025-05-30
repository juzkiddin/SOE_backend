import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { OtpController } from './otp.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RateLimitingModule } from '../rate-limiting/rate-limiting.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule, RateLimitingModule], // Add RateLimitingModule here
  controllers: [OtpController],
  providers: [OtpService],
})
export class OtpModule { }