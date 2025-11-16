import { PrismaClient } from '@prisma/client';
interface LoginCredentials {
    email: string;
    password: string;
}
interface LoginResult {
    token: string;
    user: any;
}
interface TokenPayload {
    userId: string;
    email: string;
    role: string;
    sessionVersion: number;
}
export declare class AuthService {
    private prisma;
    private resetTokenCache;
    constructor(prisma: PrismaClient);
    login(credentials: LoginCredentials, ipAddress?: string, userAgent?: string): Promise<LoginResult>;
    getProfile(userId: string): Promise<any>;
    getPermissions(userId: string): Promise<any>;
    verifyToken(token: string): TokenPayload;
    generatePasswordResetToken(email: string): Promise<string>;
    validatePasswordResetToken(token: string): string | undefined;
    resetPassword(token: string, newPassword: string): Promise<void>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    invalidateAllSessions(userId: string): Promise<void>;
    hasPermission(userId: string, permission: string): Promise<boolean>;
}
export {};
//# sourceMappingURL=AuthService.d.ts.map