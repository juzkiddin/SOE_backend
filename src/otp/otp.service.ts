import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as otpGenerator from 'otp-generator';
import * as uuid from 'uuid';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OtpService {
    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) { }

    async generateOtp(): Promise<{ uuid: string }> {
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
            },
        });

        return { uuid: otpRecord.id };
    }

    async verifyOtp(uuid: string, otpCode: string): Promise<{ success: boolean }> {
        const otpRecord = await this.prisma.otp.findUnique({
            where: { id: uuid },
        });

        if (!otpRecord) {
            return { success: false };
        }

        // Check if OTP is already verified or expired
        if (otpRecord.verified || new Date() > otpRecord.expiresAt) {
            return { success: false };
        }

        // Check if OTP code matches
        if (otpRecord.otpCode !== otpCode) {
            return { success: false };
        }

        // Mark as verified
        await this.prisma.otp.update({
            where: { id: uuid },
            data: { verified: true },
        });

        // Optionally: Delete the record after verification
        await this.prisma.otp.delete({ where: { id: uuid } });

        return { success: true };
    }
}