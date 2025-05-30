import { Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as otpGenerator from 'otp-generator';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { RateLimitingService } from '../rate-limiting/rate-limiting.service';

@Injectable()
export class OtpService {
    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private rateLimitingService: RateLimitingService,
    ) { }

    async generateOtp(req: Request, res: Response): Promise<{ uuid: string; attemptsLeft: number }> {
        // First check rate limits - this will create a new cookie if none exists
        const { allowed, attemptsLeft } = await this.rateLimitingService.checkRateLimit(req, res);

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

        // Get the clientId (either existing or newly created by checkRateLimit)
        const clientId = req.signedCookies?.[this.rateLimitingService.COOKIE_NAME];

        if (!clientId) {
            throw new UnauthorizedException('No valid session found for OTP generation');
        }

        // Clear any existing OTP records for this client before creating a new one
        await this.prisma.otp.deleteMany({
            where: {
                clientId: clientId,
                verified: false
            }
        });

        const otpRecord = await this.prisma.otp.create({
            data: {
                otpCode,
                expiresAt,
                clientId,
            },
        });

        return { uuid: otpRecord.id, attemptsLeft };
    }

    async verifyOtp(uuid: string, otpCode: string, req: Request, res: Response): Promise<{ success: boolean }> {
        const clientId = req.signedCookies?.[this.rateLimitingService.COOKIE_NAME];
        if (!clientId) {
            throw new UnauthorizedException('No active OTP session');
        }

        const otpRecord = await this.prisma.otp.findUnique({
            where: { id: uuid, clientId },
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

        // On successful verification:
        // 1. Clear only the rate limit attempts (not the session)
        await this.rateLimitingService.clearRateLimitAttempts(req);

        // 2. Mark as verified and delete the OTP
        await this.prisma.otp.update({
            where: { id: uuid },
            data: { verified: true },
        });

        await this.prisma.otp.delete({ where: { id: uuid } });

        return { success: true };
    }
}