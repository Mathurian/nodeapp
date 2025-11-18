import { Request, Response, NextFunction } from 'express';
export declare class EventTemplateController {
    private eventTemplateService;
    constructor();
    createTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        id: any;
        name: any;
        description: any;
        contests: any;
        categories: any;
        createdAt: any;
    }>, Record<string, any>>>;
    getTemplates: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
    getTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        id: any;
        name: any;
        description: any;
        contests: any;
        categories: any;
        creator: any;
        createdAt: any;
        updatedAt: any;
    }>, Record<string, any>>>;
    updateTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        id: any;
        name: any;
        description: any;
        contests: any;
        categories: any;
        updatedAt: any;
    }>, Record<string, any>>>;
    deleteTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
    createEventFromTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        id: any;
        name: any;
        description: any;
        startDate: any;
        endDate: any;
        createdAt: any;
    }>, Record<string, any>>>;
}
export declare const createTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    id: any;
    name: any;
    description: any;
    contests: any;
    categories: any;
    createdAt: any;
}>, Record<string, any>>>;
export declare const getTemplates: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
export declare const getTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    id: any;
    name: any;
    description: any;
    contests: any;
    categories: any;
    creator: any;
    createdAt: any;
    updatedAt: any;
}>, Record<string, any>>>;
export declare const updateTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    id: any;
    name: any;
    description: any;
    contests: any;
    categories: any;
    updatedAt: any;
}>, Record<string, any>>>;
export declare const deleteTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
export declare const createEventFromTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    id: any;
    name: any;
    description: any;
    startDate: any;
    endDate: any;
    createdAt: any;
}>, Record<string, any>>>;
//# sourceMappingURL=eventTemplateController.d.ts.map