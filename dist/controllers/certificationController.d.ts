import { Request, Response, NextFunction } from 'express';
export declare class CertificationController {
    private certificationService;
    private prisma;
    constructor();
    getOverallStatus: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        event: string;
        contests: any[];
    }>, Record<string, any>>>;
    certifyAll: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        success: boolean;
        message: string;
    }>, Record<string, any>>>;
    getAllCertifications: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    createCertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    updateCertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    deleteCertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getCertificationById: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    certifyJudge: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    certifyTally: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    certifyAuditor: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    approveBoard: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    rejectCertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getCertificationStats: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const getOverallStatus: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    event: string;
    contests: any[];
}>, Record<string, any>>>;
export declare const certifyAll: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    success: boolean;
    message: string;
}>, Record<string, any>>>;
export declare const getAllCertifications: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const createCertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const updateCertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const deleteCertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getCertificationById: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const certifyJudge: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const certifyTally: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const certifyAuditor: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const approveBoard: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const rejectCertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getCertificationStats: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=certificationController.d.ts.map