import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

@Injectable()
export class CacheService {
    private cache: Map<string, CacheEntry<any>> = new Map();

    async get<T>(key: string): Promise<T | undefined> {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }

        return entry.value;
    }

    async set(key: string, value: any, ttlMs: number): Promise<void> {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttlMs
        });
    }

    async del(key: string): Promise<void> {
        this.cache.delete(key);
    }

    generateOtpKey(clientId: string): string {
        return `otp:${clientId}`;
    }

    generateRateLimitKey(clientId: string): string {
        return `ratelimit:${clientId}`;
    }

    // Cleanup expired entries periodically
    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    constructor() {
        // Run cleanup every minute
        setInterval(() => this.cleanup(), 60000);
    }
} 