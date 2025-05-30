import { Module } from '@nestjs/common';
import { RateLimitingService } from './rate-limiting.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [RateLimitingService],
    exports: [RateLimitingService], // Important: Export the service
})
export class RateLimitingModule { }