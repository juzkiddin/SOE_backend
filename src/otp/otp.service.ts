import { Injectable, ForbiddenException, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as otpGenerator from 'otp-generator';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { RateLimitingService } from '../rate-limiting/rate-limiting.service';
import { CryptoService } from './crypto.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OtpService {
    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private rateLimitingService: RateLimitingService,
        private cryptoService: CryptoService,
    ) { }

    async generateOtp(
        req: Request,
        res: Response,
        tableId: string
    ): Promise<{ uuid: string; attemptsLeft: number }> {
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
                tableId,
                verified: false,
            }
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

    async getOtp(
        tableId: string,
        clientSecret: string,
        clientKey: string
    ): Promise<{ encryptedOtp: string; publicKey: string; uuid: string }> {
        // Authentication is handled by guard, if we get here, credentials are valid
        const otpRecord = await this.prisma.otp.findFirst({
            where: {
                tableId,
                verified: false,
                expiresAt: {
                    gt: new Date()
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!otpRecord) {
            throw new NotFoundException('OTP not found');
        }

        const encryptedOtp = this.cryptoService.encryptOtp(otpRecord.otpCode);
        const publicKey = this.cryptoService.getPublicKey();

        return {
            encryptedOtp,
            publicKey,
            uuid: otpRecord.id,
        };
    }
}