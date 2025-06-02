import { Module } from '@nestjs/common';
import { RateLimitingService } from './rate-limiting.service';
import { RateLimitingGuard } from './rate-limiting.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [PrismaModule, ConfigModule],
    providers: [RateLimitingService, RateLimitingGuard],
    exports: [RateLimitingService, RateLimitingGuard], // Export both service and guard
})
export class RateLimitingModule { }