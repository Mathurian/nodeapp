import { Request, Response, NextFunction } from 'express';
export declare class EventTemplateController {
    private eventTemplateService;
    constructor();
    createTemplate: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        name: string;
        description: string;
        contests: any;
        categories: any;
        createdAt: Date;
    }>, Record<string, any>>>;
    getTemplates: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        name: string;
        description: string;
        contests: any;
        categories: any;
        creator: never;
        createdAt: Date;
        updatedAt: Date;
    }[]>, Record<string, any>>>;
    getTemplate: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        name: string;
        description: string;
        contests: any;
        categories: any;
        creator: never;
        createdAt: Date;
        updatedAt: Date;
    }>, Record<string, any>>>;
    updateTemplate: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        name: string;
        description: string;
        contests: any;
        categories: any;
        updatedAt: Date;
    }>, Record<string, any>>>;
    deleteTemplate: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
    createEventFromTemplate: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        name: string;
        description: string;
        startDate: Date;
        endDate: Date;
        createdAt: Date;
    }>, Record<string, any>>>;
}
export declare const createTemplate: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    name: string;
    description: string;
    contests: any;
    categories: any;
    createdAt: Date;
}>, Record<string, any>>>;
export declare const getTemplates: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    name: string;
    description: string;
    contests: any;
    categories: any;
    creator: never;
    createdAt: Date;
    updatedAt: Date;
}[]>, Record<string, any>>>;
export declare const getTemplate: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    name: string;
    description: string;
    contests: any;
    categories: any;
    creator: never;
    createdAt: Date;
    updatedAt: Date;
}>, Record<string, any>>>;
export declare const updateTemplate: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    name: string;
    description: string;
    contests: any;
    categories: any;
    updatedAt: Date;
}>, Record<string, any>>>;
export declare const deleteTemplate: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
export declare const createEventFromTemplate: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
}>, Record<string, any>>>;
//# sourceMappingURL=eventTemplateController.d.ts.map