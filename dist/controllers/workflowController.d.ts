import { Request, Response, NextFunction } from 'express';
export declare const createTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const listTemplates: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const startWorkflow: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const advanceWorkflow: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getInstance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const listInstancesForEntity: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=workflowController.d.ts.map