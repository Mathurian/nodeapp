import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
export declare const passwordSchema: z.ZodString;
export declare const validatePasswordStatic: (password: string) => {
    valid: boolean;
    errors: string[];
};
export declare const validatePasswordStaticMiddleware: (passwordField?: string) => (req: Request, res: Response, next: NextFunction) => void;
declare const validatePassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const getPasswordPolicy: (req: Request, res: Response) => Promise<void>;
declare const updatePasswordPolicy: (req: Request, res: Response) => Promise<void>;
export { validatePassword, getPasswordPolicy, updatePasswordPolicy };
//# sourceMappingURL=passwordValidation.d.ts.map