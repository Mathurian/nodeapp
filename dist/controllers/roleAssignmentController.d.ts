import { Request, Response, NextFunction } from 'express';
export declare class RoleAssignmentController {
    private roleAssignmentService;
    constructor();
    getAllRoleAssignments: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
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
    }[]>, Record<string, any>>>;
    createRoleAssignment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
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
    }>, Record<string, any>>>;
    updateRoleAssignment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
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
    }>, Record<string, any>>>;
    deleteRoleAssignment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
}
export declare const getAllRoleAssignments: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
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
}[]>, Record<string, any>>>;
export declare const createRoleAssignment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
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
}>, Record<string, any>>>;
export declare const updateRoleAssignment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
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
}>, Record<string, any>>>;
export declare const deleteRoleAssignment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
//# sourceMappingURL=roleAssignmentController.d.ts.map