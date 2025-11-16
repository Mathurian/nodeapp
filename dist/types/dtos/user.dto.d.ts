import { BaseEntity } from '../models/base.types';
export interface CreateUserDto {
    username: string;
    email: string;
    password: string;
    role: UserRole;
    name?: string;
    phone?: string;
    bio?: string;
}
export interface UpdateUserDto {
    username?: string;
    email?: string;
    name?: string;
    phone?: string;
    bio?: string;
    imagePath?: string;
    isActive?: boolean;
    timezone?: string;
    language?: string;
    notifications?: string;
    smsEnabled?: boolean;
    navigationPreferences?: any;
}
export interface UpdatePasswordDto {
    currentPassword: string;
    newPassword: string;
}
export interface LoginDto {
    username: string;
    password: string;
}
export interface UserResponseDto extends BaseEntity {
    username: string;
    email: string;
    role: UserRole;
    name: string | null;
    phone: string | null;
    bio: string | null;
    imagePath: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;
    timezone: string;
    language: string;
}
export type UserRole = 'ADMIN' | 'SUPER_ADMIN' | 'JUDGE' | 'TALLY_MASTER' | 'EMCEE' | 'AUDITOR' | 'BOARD' | 'CONTESTANT' | 'USER';
//# sourceMappingURL=user.dto.d.ts.map