import { PrismaClient } from '@prisma/client';
import { Request } from 'express';
export interface RateLimitConfig {
    tier: string;
    points: number;
    duration: number;
    blockDuration: number;
}
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    limit: number;
}
export declare class RateLimitService {
    private prisma;
    private configCache;
    private redis;
    private redisEnabled;
    private redisUnavailableLogged;
    private log;
    constructor(prisma: PrismaClient);
    private initializeRedis;
    private initializeDefaultConfigs;
    getConfig(tier: string): Promise<RateLimitConfig>;
    updateConfig(tier: string, updates: Partial<RateLimitConfig>): Promise<RateLimitConfig>;
    getAllConfigs(): Promise<RateLimitConfig[]>;
    createLimiter(tier: string, customConfig?: Partial<RateLimitConfig>): (req: Request) => Promise<RateLimitConfig>;
    getTierFromRequest(req: Request): string;
    private createRedisStore;
    createEndpointLimiter(endpoint: string, config: Partial<RateLimitConfig>): import("express-rate-limit").RateLimitRequestHandler;
    createUserLimiter(userId: string, config: Partial<RateLimitConfig>): import("express-rate-limit").RateLimitRequestHandler;
    isRedisAvailable(): boolean;
}
export default RateLimitService;
//# sourceMappingURL=RateLimitService.d.ts.map