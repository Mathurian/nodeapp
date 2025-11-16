import { Request, Response } from 'express';
export declare class TenantController {
    static createTenant(req: Request, res: Response): Promise<void>;
    static listTenants(req: Request, res: Response): Promise<void>;
    static getTenant(req: Request, res: Response): Promise<void>;
    static updateTenant(req: Request, res: Response): Promise<void>;
    static activateTenant(req: Request, res: Response): Promise<void>;
    static deactivateTenant(req: Request, res: Response): Promise<void>;
    static deleteTenant(req: Request, res: Response): Promise<void>;
    static getTenantAnalytics(req: Request, res: Response): Promise<void>;
    static inviteUser(req: Request, res: Response): Promise<void>;
    static getCurrentTenant(req: Request, res: Response): Promise<void>;
}
export default TenantController;
//# sourceMappingURL=tenantController.d.ts.map