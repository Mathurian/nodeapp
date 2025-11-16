import { User, UserRole, PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
import { UserRepository } from '../repositories/UserRepository';
export interface CreateUserDTO {
    name: string;
    email: string;
    password: string;
    preferredName?: string;
    role: string | UserRole;
    gender?: string;
    pronouns?: string;
    phone?: string;
    address?: string;
    bio?: string;
    judgeNumber?: string;
    judgeLevel?: string;
    isHeadJudge?: boolean;
    contestantNumber?: number;
    age?: number;
    school?: string;
    grade?: string;
    parentGuardian?: string;
    parentPhone?: string;
    contestAssignment?: string;
    categoryAssignment?: string;
}
export interface UpdateUserDTO {
    name?: string;
    email?: string;
    preferredName?: string;
    role?: string | UserRole;
    isActive?: boolean;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    bio?: string;
    pronouns?: string;
    gender?: string;
    judgeNumber?: string;
    judgeLevel?: string;
    isHeadJudge?: boolean;
    contestantNumber?: number;
    age?: number;
    school?: string;
    grade?: string;
    parentGuardian?: string;
    parentPhone?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
}
export interface ChangePasswordDTO {
    currentPassword: string;
    newPassword: string;
}
export interface UserImageUploadDTO {
    userId: string;
    imagePath: string;
}
export declare class UserService extends BaseService {
    private userRepository;
    private prisma;
    constructor(userRepository: UserRepository, prisma: PrismaClient);
    getAllUsers(): Promise<User[]>;
    getActiveUsers(): Promise<User[]>;
    getUserById(userId: string): Promise<User>;
    getUserByName(name: string): Promise<User | null>;
    getUserByEmail(email: string): Promise<User | null>;
    getUsersByRole(role: string): Promise<User[]>;
    createUser(data: CreateUserDTO): Promise<User>;
    updateUser(userId: string, data: UpdateUserDTO): Promise<User>;
    changePassword(userId: string, data: ChangePasswordDTO): Promise<void>;
    toggleUserActiveStatus(userId: string): Promise<User>;
    deleteUser(userId: string): Promise<void>;
    searchUsers(query: string): Promise<User[]>;
    getUserStats(userId: string): Promise<any>;
    private isValidEmail;
    protected sanitizeUser(user: User): User;
    updateUserImage(userId: string, imagePath: string): Promise<User>;
    resetUserPassword(userId: string, newPassword: string): Promise<void>;
    updateLastLogin(userId: string): Promise<User>;
    bulkDeleteUsers(userIds: string[], forceDeleteAdmin?: boolean): Promise<{
        deletedCount: number;
    }>;
    deleteUsersByRole(role: string): Promise<{
        deletedCount: number;
    }>;
    getAggregateUserStats(): Promise<any>;
    getAllUsersWithRelations(): Promise<any[]>;
    getUserByIdWithRelations(userId: string): Promise<any>;
}
//# sourceMappingURL=UserService.d.ts.map