import { Module } from '@nestjs/common';
import { RateLimitingService } from './rate-limiting.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [PrismaModule, ConfigModule],
    providers: [RateLimitingService],
    exports: [RateLimitingService], // Important: Export the service
})
export class RateLimitingModule { }