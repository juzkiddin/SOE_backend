import { Injectable, OnModuleInit } from '@nestjs/common';
import * as NodeRSA from 'node-rsa';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService implements OnModuleInit {
    private key: NodeRSA;
    private publicKey: string;
    private certKey: string;
    private readonly ALGORITHM = 'aes-256-gcm';
    private readonly IV_LENGTH = 16;
    private readonly AUTH_TAG_LENGTH = 16;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        // Generate a new RSA key pair or load existing one
        this.key = new NodeRSA({ b: 2048 }); // 2048 bits key
        this.publicKey = this.key.exportKey('public');

        // Get the certificate key from environment
        const certKey = this.configService.get<string>('OTP_CERT_KEY');
        if (!certKey) {
            throw new Error('OTP_CERT_KEY must be set in environment variables');
        }
        this.certKey = certKey;
    }

    getPublicKey(): string {
        return this.publicKey;
    }

    encryptOtp(otp: string): string {
        // First layer: RSA encryption
        const rsaEncrypted = this.key.encryptPrivate(otp, 'base64');

        // Second layer: AES encryption
        // Generate a random IV
        const iv = crypto.randomBytes(this.IV_LENGTH);

        // Create cipher using OTP_CERT_KEY
        const key = crypto.scryptSync(this.certKey, 'salt', 32);
        const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

        // Encrypt the RSA encrypted data
        let encrypted = cipher.update(rsaEncrypted, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        // Get the auth tag
        const authTag = cipher.getAuthTag();

        // Combine IV and auth tag with the encrypted data
        // Format: base64(iv):base64(authTag):base64(encryptedData)
        return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
    }

    // This method would typically be on the client side
    decryptOtp(encryptedData: string): string {
        // Split the components
        const [ivBase64, authTagBase64, encryptedBase64] = encryptedData.split(':');
        if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
            throw new Error('Invalid encrypted data format');
        }

        // Convert components from base64
        const iv = Buffer.from(ivBase64, 'base64');
        const authTag = Buffer.from(authTagBase64, 'base64');

        // First layer: AES decryption
        const key = crypto.scryptSync(this.certKey, 'salt', 32);
        const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        // Second layer: RSA decryption
        return this.key.decryptPublic(decrypted, 'utf8');
    }
} 