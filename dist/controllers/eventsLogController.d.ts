import { Request, Response, NextFunction } from 'express';
export declare const listEventLogs: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getEventLog: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const listWebhooks: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const createWebhook: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateWebhook: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteWebhook: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=eventsLogController.d.ts.map