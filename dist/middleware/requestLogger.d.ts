import { Request, Response, NextFunction } from 'express';
declare const requestLogging: (req: Request, res: Response, next: NextFunction) => void;
declare const errorLogging: (err: any, req: Request, res: Response, next: NextFunction) => void;
export { requestLogging, errorLogging };
//# sourceMappingURL=requestLogger.d.ts.map