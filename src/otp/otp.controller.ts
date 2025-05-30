import { Body, Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { OtpService } from './otp.service';
import { Request, Response } from 'express';

@Controller('otp')
export class OtpController {
    constructor(private readonly otpService: OtpService) { }

    @Post('generate')
    async generateOtp(@Req() req: Request, @Res() res: Response) {
        // Get or create client ID from cookie
        let clientId = req.cookies['otp_attempts'];
        if (!clientId) {
            clientId = require('uuid').v4(); // Generate new UUID if no cookie
        }

        const result = await this.otpService.generateOtp(clientId, res);
        return res.json(result);
    }

    @Post('verify')
    async verifyOtp(
        @Body() body: { uuid: string; otpCode: string },
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const clientId = req.cookies['otp_attempts'];
        if (!clientId) {
            throw new UnauthorizedException('No active OTP session');
        }

        const result = await this.otpService.verifyOtp(body.uuid, body.otpCode, clientId, res);
        return res.json(result);
    }
}