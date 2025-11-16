import { Request, Response, NextFunction } from 'express';
declare const checkFileAccess: (requiredPermission?: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const checkFilePermission: (file: any, userId: string, userRole: string, permission: string) => Promise<{
    allowed: boolean;
    reason: string;
}>;
declare const getRoleFilePermissions: (userRole: string, fileCategory: string) => Promise<string[]>;
declare const checkUploadPermission: (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const checkSharingPermission: (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const getUserFileAccess: (req: Request, res: Response) => Promise<void>;
export { checkFileAccess, checkFilePermission, getRoleFilePermissions, checkUploadPermission, checkSharingPermission, getUserFileAccess };
//# sourceMappingURL=fileAccessControl.d.ts.map