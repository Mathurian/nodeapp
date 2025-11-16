import { Request, Response, NextFunction } from 'express';
export declare class AuthController {
    private authService;
    constructor();
    login: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getProfile: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getPermissions: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    requestPasswordReset: (req: Request, res: Response) => Promise<Response | void>;
    resetPassword: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    changePassword: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    logout: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
declare const controller: AuthController;
export declare const login: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getProfile: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getPermissions: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const requestPasswordReset: (req: Request, res: Response) => Promise<Response | void>;
export declare const resetPassword: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const changePassword: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const logout: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const forgotPassword: (req: Request, res: Response) => Promise<Response | void>;
export declare const resetPasswordWithToken: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export default controller;
//# sourceMappingURL=authController.d.ts.map