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
            completed: any;
            missing: number;
            certifications: any;
        };
        scoreStatus: {
            total: any;
            uncertified: any;
            completed: boolean;
        };
        auditorCertified: boolean;
        auditorCertification: {
            certifiedAt: any;
            certifiedBy: any;
        };
    }>, Record<string, any>>>;
    submitFinalCertification: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
}
export declare const getFinalCertificationStatus: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    categoryId: string;
    categoryName: any;
    canCertify: boolean;
    readyForFinalCertification: boolean;
    alreadyCertified: boolean;
    tallyCertifications: {
        required: any;
        completed: any;
        missing: number;
        certifications: any;
    };
    scoreStatus: {
        total: any;
        uncertified: any;
        completed: boolean;
    };
    auditorCertified: boolean;
    auditorCertification: {
        certifiedAt: any;
        certifiedBy: any;
    };
}>, Record<string, any>>>;
export declare const submitFinalCertification: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
//# sourceMappingURL=auditorCertificationController.d.ts.map