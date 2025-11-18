import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
interface RoleAssignmentFilters {
    role?: string;
    contestId?: string;
    eventId?: string;
    categoryId?: string;
}
interface CreateRoleAssignmentDto {
    userId: string;
    role: string;
    contestId?: string;
    eventId?: string;
    categoryId?: string;
    notes?: string;
    assignedBy: string;
}
interface UpdateRoleAssignmentDto {
    notes?: string;
    isActive?: boolean;
}
export declare class RoleAssignmentService extends BaseService {
    private prisma;
    private readonly VALID_ROLES;
    constructor(prisma: PrismaClient);
    getAll(filters: RoleAssignmentFilters): Promise<{
        id: string;
        tenantId: string;
        categoryId: string | null;
        contestId: string | null;
        eventId: string | null;
        assignedAt: Date;
        assignedBy: string;
        notes: string | null;
        role: string;
        isActive: boolean;
        userId: string;
    }[]>;
    create(data: CreateRoleAssignmentDto): Promise<{
        id: string;
        tenantId: string;
        categoryId: string | null;
        contestId: string | null;
        eventId: string | null;
        assignedAt: Date;
        assignedBy: string;
        notes: string | null;
        role: string;
        isActive: boolean;
        userId: string;
    }>;
    update(id: string, data: UpdateRoleAssignmentDto): Promise<{
        id: string;
        tenantId: string;
        categoryId: string | null;
        contestId: string | null;
        eventId: string | null;
        assignedAt: Date;
        assignedBy: string;
        notes: string | null;
        role: string;
        isActive: boolean;
        userId: string;
    }>;
    delete(id: string): Promise<void>;
}
export {};
//# sourceMappingURL=RoleAssignmentService.d.ts.map