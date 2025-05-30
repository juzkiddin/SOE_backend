import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as otpGenerator from 'otp-generator';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { RateLimitingService } from '../rate-limiting/rate-limiting.service';

@Injectable()
export class OtpService {
    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private rateLimitingService: RateLimitingService,
    ) { }

    async generateOtp(clientId: string, res: Response): Promise<{ uuid: string; attemptsLeft: number }> {
        // Check rate limit
        const { allowed, attemptsLeft } = await this.rateLimitingService.checkRateLimit(clientId, res);

        if (!allowed) {
            throw new ForbiddenException(`Rate limit exceeded. Try again later.`);
        }

        const otpCode = otpGenerator.generate(6, {
            digits: true,
            lowerCaseAlphabets: false,
            upperCaseAlphabets: false,
            specialChars: false,
        });

        const otpDurationMinutes = this.configService.get<number>('OTP_DURATION_MINUTES', 5);
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + otpDurationMinutes);

        const otpRecord = await this.prisma.otp.create({
            data: {
                otpCode,
                expiresAt,
                clientId, // Store clientId with OTP
            },
        });

        return { uuid: otpRecord.id, attemptsLeft };
    }

    async verifyOtp(uuid: string, otpCode: string, clientId: string, res: Response): Promise<{ success: boolean }> {
        const otpRecord = await this.prisma.otp.findUnique({
            where: { id: uuid, clientId }, // Verify clientId matches
        });

        if (!otpRecord) {
            return { success: false };
        }

        if (otpRecord.verified || new Date() > otpRecord.expiresAt) {
            return { success: false };
        }

        if (otpRecord.otpCode !== otpCode) {
            return { success: false };
        }

        // Mark as verified
        await this.prisma.otp.update({
            where: { id: uuid },
            data: { verified: true },
        });

        // Clear rate limiting for successful verification
        await this.rateLimitingService.clearRateLimit(clientId, res);

        // Delete the OTP record
        await this.prisma.otp.delete({ where: { id: uuid } });

        return { success: true };
    }
}