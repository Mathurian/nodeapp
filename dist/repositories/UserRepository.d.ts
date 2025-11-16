import { User, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';
export type UserWithRelations = Prisma.UserGetPayload<{
    include: {
        assignedAssignments: true;
        contestant: true;
        judge: true;
    };
}>;
export declare class UserRepository extends BaseRepository<User> {
    protected getModelName(): string;
    findByName(name: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findByNameOrEmail(nameOrEmail: string): Promise<User | null>;
    findByRole(role: string): Promise<User[]>;
    findActiveUsers(): Promise<User[]>;
    findUsersWithAssignments(eventId: string): Promise<UserWithRelations[]>;
    searchUsers(query: string): Promise<User[]>;
    updateLastLogin(userId: string): Promise<User>;
    updatePassword(userId: string, hashedPassword: string): Promise<User>;
    toggleActiveStatus(userId: string): Promise<User>;
    getUserStats(userId: string): Promise<{
        totalAssignments: number;
        eventsParticipated: number;
    }>;
}
//# sourceMappingURL=UserRepository.d.ts.map