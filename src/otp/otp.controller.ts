import { Body, Controller, Post } from '@nestjs/common';
import { OtpService } from './otp.service';

@Controller('otp')
export class OtpController {
    constructor(private readonly otpService: OtpService) { }

    @Post('generate')
    async generateOtp() {
        return this.otpService.generateOtp();
    }

    @Post('verify')
    async verifyOtp(@Body() body: { uuid: string; otpCode: string }) {
        return this.otpService.verifyOtp(body.uuid, body.otpCode);
    }
}