import { Request, Response, NextFunction } from 'express';
declare const logActivity: (action: string, resourceType?: string | null, resourceId?: string | null) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const errorHandler: (err: any, req: Request, res: Response, next: NextFunction) => void;
export { logActivity, errorHandler };
//# sourceMappingURL=errorHandler.d.ts.map