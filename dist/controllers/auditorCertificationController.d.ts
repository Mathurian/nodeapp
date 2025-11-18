import { Request, Response, NextFunction } from 'express';
export declare class AuditorCertificationController {
    private auditorCertificationService;
    constructor();
    getFinalCertificationStatus: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        categoryId: string;
        categoryName: any;
        canCertify: boolean;
        readyForFinalCertification: boolean;
        alreadyCertified: boolean;
        tallyCertifications: {
            required: any;
            completed: number;
            missing: number;
            certifications: {
                id: string;
                categoryId: string;
                role: string;
                userId: string;
                signatureName: string | null;
                certifiedAt: Date;
                comments: string | null;
                tenantId: string;
            }[];
        };
        scoreStatus: {
            total: any;
            uncertified: any;
            completed: boolean;
        };
        auditorCertified: boolean;
        auditorCertification: {
            certifiedAt: Date;
            certifiedBy: string;
        };
    }>, Record<string, any>>>;
    submitFinalCertification: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        categoryId: string;
        role: string;
        userId: string;
        signatureName: string | null;
        certifiedAt: Date;
        comments: string | null;
        tenantId: string;
    }>, Record<string, any>>>;
}
export declare const getFinalCertificationStatus: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    categoryId: string;
    categoryName: any;
    canCertify: boolean;
    readyForFinalCertification: boolean;
    alreadyCertified: boolean;
    tallyCertifications: {
        required: any;
        completed: number;
        missing: number;
        certifications: {
            id: string;
            categoryId: string;
            role: string;
            userId: string;
            signatureName: string | null;
            certifiedAt: Date;
            comments: string | null;
            tenantId: string;
        }[];
    };
    scoreStatus: {
        total: any;
        uncertified: any;
        completed: boolean;
    };
    auditorCertified: boolean;
    auditorCertification: {
        certifiedAt: Date;
        certifiedBy: string;
    };
}>, Record<string, any>>>;
export declare const submitFinalCertification: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    categoryId: string;
    role: string;
    userId: string;
    signatureName: string | null;
    certifiedAt: Date;
    comments: string | null;
    tenantId: string;
}>, Record<string, any>>>;
//# sourceMappingURL=auditorCertificationController.d.ts.map