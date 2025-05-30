import { Injectable, OnModuleInit } from '@nestjs/common';
import * as NodeRSA from 'node-rsa';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CryptoService implements OnModuleInit {
    private key: NodeRSA;
    private publicKey: string;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        // Generate a new RSA key pair or load existing one
        this.key = new NodeRSA({ b: 2048 }); // 2048 bits key
        this.publicKey = this.key.exportKey('public');
    }

    getPublicKey(): string {
        return this.publicKey;
    }

    encryptOtp(otp: string): string {
        return this.key.encryptPrivate(otp, 'base64');
    }

    // This method would typically be on the client side
    decryptOtp(encryptedOtp: string): string {
        return this.key.decryptPublic(encryptedOtp, 'utf8');
    }
} 