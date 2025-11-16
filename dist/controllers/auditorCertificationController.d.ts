import { Request, Response, NextFunction } from 'express';
export declare class AuditorCertificationController {
    private auditorCertificationService;
    constructor();
    getFinalCertificationStatus: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        categoryId: string;
        categoryName: string;
        canCertify: boolean;
        readyForFinalCertification: boolean;
        alreadyCertified: boolean;
        tallyCertifications: {
            required: number;
            completed: number;
            missing: number;
            certifications: {
                id: string;
                userId: string;
                categoryId: string;
                role: string;
                certifiedAt: Date;
                comments: string | null;
                signatureName: string | null;
            }[];
        };
        scoreStatus: {
            total: number;
            uncertified: number;
            completed: boolean;
        };
        auditorCertified: boolean;
        auditorCertification: {
            certifiedAt: Date;
            certifiedBy: string;
        };
    }>, Record<string, any>>>;
    submitFinalCertification: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        userId: string;
        categoryId: string;
        role: string;
        certifiedAt: Date;
        comments: string | null;
        signatureName: string | null;
    }>, Record<string, any>>>;
}
export declare const getFinalCertificationStatus: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    categoryId: string;
    categoryName: string;
    canCertify: boolean;
    readyForFinalCertification: boolean;
    alreadyCertified: boolean;
    tallyCertifications: {
        required: number;
        completed: number;
        missing: number;
        certifications: {
            id: string;
            userId: string;
            categoryId: string;
            role: string;
            certifiedAt: Date;
            comments: string | null;
            signatureName: string | null;
        }[];
    };
    scoreStatus: {
        total: number;
        uncertified: number;
        completed: boolean;
    };
    auditorCertified: boolean;
    auditorCertification: {
        certifiedAt: Date;
        certifiedBy: string;
    };
}>, Record<string, any>>>;
export declare const submitFinalCertification: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    userId: string;
    categoryId: string;
    role: string;
    certifiedAt: Date;
    comments: string | null;
    signatureName: string | null;
}>, Record<string, any>>>;
//# sourceMappingURL=auditorCertificationController.d.ts.map