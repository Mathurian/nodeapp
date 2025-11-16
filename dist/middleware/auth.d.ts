import { Request, Response, NextFunction } from 'express';
declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const requireRole: (roles: string[]) => ((req: Request, res: Response, next: NextFunction) => void);
declare const requirePermission: (action: string) => ((req: Request, res: Response, next: NextFunction) => void);
declare const checkRoles: (roles: string[]) => ((req: Request, res: Response, next: NextFunction) => void);
export { authenticateToken, requireRole, requirePermission, checkRoles };
//# sourceMappingURL=auth.d.ts.map