import { Request, Response, NextFunction } from 'express';
export declare class RoleAssignmentController {
    private roleAssignmentService;
    constructor();
    getAllRoleAssignments: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        role: string;
        isActive: boolean;
        tenantId: string | null;
        eventId: string | null;
        categoryId: string | null;
        contestId: string | null;
        userId: string;
        assignedAt: Date;
        assignedBy: string;
        notes: string | null;
    }[]>, Record<string, any>>>;
    createRoleAssignment: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        role: string;
        isActive: boolean;
        tenantId: string | null;
        eventId: string | null;
        categoryId: string | null;
        contestId: string | null;
        userId: string;
        assignedAt: Date;
        assignedBy: string;
        notes: string | null;
    }>, Record<string, any>>>;
    updateRoleAssignment: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        role: string;
        isActive: boolean;
        tenantId: string | null;
        eventId: string | null;
        categoryId: string | null;
        contestId: string | null;
        userId: string;
        assignedAt: Date;
        assignedBy: string;
        notes: string | null;
    }>, Record<string, any>>>;
    deleteRoleAssignment: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
}
export declare const getAllRoleAssignments: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    role: string;
    isActive: boolean;
    tenantId: string | null;
    eventId: string | null;
    categoryId: string | null;
    contestId: string | null;
    userId: string;
    assignedAt: Date;
    assignedBy: string;
    notes: string | null;
}[]>, Record<string, any>>>;
export declare const createRoleAssignment: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    role: string;
    isActive: boolean;
    tenantId: string | null;
    eventId: string | null;
    categoryId: string | null;
    contestId: string | null;
    userId: string;
    assignedAt: Date;
    assignedBy: string;
    notes: string | null;
}>, Record<string, any>>>;
export declare const updateRoleAssignment: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    role: string;
    isActive: boolean;
    tenantId: string | null;
    eventId: string | null;
    categoryId: string | null;
    contestId: string | null;
    userId: string;
    assignedAt: Date;
    assignedBy: string;
    notes: string | null;
}>, Record<string, any>>>;
export declare const deleteRoleAssignment: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
//# sourceMappingURL=roleAssignmentController.d.ts.map