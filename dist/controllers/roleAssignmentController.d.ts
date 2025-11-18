import { Request, Response, NextFunction } from 'express';
export declare class RoleAssignmentController {
    private roleAssignmentService;
    constructor();
    getAllRoleAssignments: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        categoryId: string | null;
        role: string;
        userId: string;
        tenantId: string;
        contestId: string | null;
        isActive: boolean;
        eventId: string | null;
        notes: string | null;
        assignedAt: Date;
        assignedBy: string;
    }[]>, Record<string, any>>>;
    createRoleAssignment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        categoryId: string | null;
        role: string;
        userId: string;
        tenantId: string;
        contestId: string | null;
        isActive: boolean;
        eventId: string | null;
        notes: string | null;
        assignedAt: Date;
        assignedBy: string;
    }>, Record<string, any>>>;
    updateRoleAssignment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        categoryId: string | null;
        role: string;
        userId: string;
        tenantId: string;
        contestId: string | null;
        isActive: boolean;
        eventId: string | null;
        notes: string | null;
        assignedAt: Date;
        assignedBy: string;
    }>, Record<string, any>>>;
    deleteRoleAssignment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
}
export declare const getAllRoleAssignments: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    categoryId: string | null;
    role: string;
    userId: string;
    tenantId: string;
    contestId: string | null;
    isActive: boolean;
    eventId: string | null;
    notes: string | null;
    assignedAt: Date;
    assignedBy: string;
}[]>, Record<string, any>>>;
export declare const createRoleAssignment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    categoryId: string | null;
    role: string;
    userId: string;
    tenantId: string;
    contestId: string | null;
    isActive: boolean;
    eventId: string | null;
    notes: string | null;
    assignedAt: Date;
    assignedBy: string;
}>, Record<string, any>>>;
export declare const updateRoleAssignment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    categoryId: string | null;
    role: string;
    userId: string;
    tenantId: string;
    contestId: string | null;
    isActive: boolean;
    eventId: string | null;
    notes: string | null;
    assignedAt: Date;
    assignedBy: string;
}>, Record<string, any>>>;
export declare const deleteRoleAssignment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
//# sourceMappingURL=roleAssignmentController.d.ts.map