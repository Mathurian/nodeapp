import { Request, Response, NextFunction } from 'express';
declare const validatePassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const getPasswordPolicy: (req: Request, res: Response) => Promise<void>;
declare const updatePasswordPolicy: (req: Request, res: Response) => Promise<void>;
export { validatePassword, getPasswordPolicy, updatePasswordPolicy };
//# sourceMappingURL=passwordValidation.d.ts.map