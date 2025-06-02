import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);
    private twilioClient: any;

    constructor(private configService: ConfigService) {
        this.initializeTwilio();
    }

    private initializeTwilio() {
        try {
            const accountSid = this.configService.get<string>('ACCOUNT_SID');
            const authToken = this.configService.get<string>('ACCOUNT_AUTHTKN');

            if (!accountSid || !authToken) {
                this.logger.warn('Twilio credentials not found. SMS functionality will be disabled.');
                return;
            }

            this.twilioClient = require('twilio')(accountSid, authToken);
            this.logger.log('Twilio SMS service initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Twilio SMS service:', error);
        }
    }

    async sendOtpSms(mobileNum: string, otpCode: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
        if (!this.twilioClient) {
            this.logger.error('Twilio client not initialized. Cannot send SMS.');
            return { success: false, error: 'SMS service not available' };
        }

        try {
            const fromNumber = this.configService.get<string>('ACCOUNT_NUMBER');

            if (!fromNumber) {
                this.logger.error('ACCOUNT_NUMBER not configured');
                return { success: false, error: 'SMS sender number not configured' };
            }

            const message = await this.twilioClient.messages.create({
                body: `Your OTP for SnapOrderEat Login is ${otpCode}`,
                from: fromNumber,
                to: mobileNum
            });

            this.logger.log(`SMS sent successfully to ${mobileNum}, Message SID: ${message.sid}`);
            return { success: true, messageId: message.sid };

        } catch (error) {
            this.logger.error(`Failed to send SMS to ${mobileNum}:`, error);
            return { success: false, error: error.message || 'Failed to send SMS' };
        }
    }
} 