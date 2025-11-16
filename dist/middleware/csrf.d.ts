import { Request, Response, NextFunction } from 'express';
declare const generateCsrfToken: (req: Request, res: Response, next: NextFunction) => void;
declare const getCsrfToken: (req: Request, res: Response) => void;
declare const csrfProtection: (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const csrfErrorHandler: (err: any, req: Request, res: Response, next: NextFunction) => void;
export { generateCsrfToken, getCsrfToken, csrfProtection, csrfErrorHandler };
//# sourceMappingURL=csrf.d.ts.map