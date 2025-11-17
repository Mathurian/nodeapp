import { Request, Response, NextFunction } from 'express';
export declare class EmailController {
    private emailService;
    private prisma;
    constructor();
    getConfig: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<import("../services/EmailService").EmailConfig>, Record<string, any>>>;
    sendEmail: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        success: boolean;
        to: string;
        subject: string;
    }>, Record<string, any>>>;
    sendBulkEmail: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any[]>, Record<string, any>>>;
    getTemplates: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    createTemplate: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    updateTemplate: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    deleteTemplate: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getCampaigns: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    createCampaign: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    sendCampaign: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getLogs: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    sendMultipleEmails: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    sendEmailByRole: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const getConfig: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<import("../services/EmailService").EmailConfig>, Record<string, any>>>;
export declare const sendEmail: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    success: boolean;
    to: string;
    subject: string;
}>, Record<string, any>>>;
export declare const sendBulkEmail: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any[]>, Record<string, any>>>;
export declare const getTemplates: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const createTemplate: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const updateTemplate: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const deleteTemplate: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getCampaigns: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const createCampaign: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const sendCampaign: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getLogs: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const sendMultipleEmails: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const sendEmailByRole: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=emailController.d.ts.map