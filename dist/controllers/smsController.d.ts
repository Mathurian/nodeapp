import { Request, Response, NextFunction } from 'express';
export declare class SMSController {
    private smsService;
    private prisma;
    constructor();
    getSMSConfig: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<import("../services/SMSService").SMSSettings>, Record<string, any>>>;
    updateSMSConfig: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
    sendSMS: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
    sendBulkSMS: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    sendNotificationSMS: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getSMSHistory: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const getSMSConfig: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<import("../services/SMSService").SMSSettings>, Record<string, any>>>;
export declare const updateSMSConfig: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
export declare const sendSMS: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
export declare const sendBulkSMS: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const sendNotificationSMS: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getSMSHistory: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=smsController.d.ts.map