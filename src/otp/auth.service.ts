import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
    constructor(private configService: ConfigService) { }

    validateClientCredentials(clientSecret: string, clientKey: string): boolean {
        const validClientSecret = this.configService.get<string>('OTP_VERIFY_SECRET');
        const validClientKey = this.configService.get<string>('OTP_VERIFY_KEY');

        if (!validClientSecret || !validClientKey) {
            throw new Error('Client credentials not configured');
        }

        const isValid = clientSecret === validClientSecret && clientKey === validClientKey;

        if (!isValid) {
            throw new UnauthorizedException('Invalid client credentials');
        }

        return true;
    }
} 