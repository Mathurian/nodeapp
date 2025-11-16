import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            tenantId?: string;
            tenant?: {
                id: string;
                name: string;
                slug: string;
                domain: string | null;
                isActive: boolean;
                settings: any;
                planType: string;
            };
            isSuperAdmin?: boolean;
        }
    }
}
export declare class TenantIdentifier {
    static fromSubdomain(req: Request): string | null;
    static fromCustomDomain(req: Request): string | null;
    static fromHeader(req: Request): string | null;
    static fromToken(req: Request): string | null;
    static fromQuery(req: Request): string | null;
}
export declare function tenantMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function optionalTenantMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function superAdminOnly(req: Request, res: Response, next: NextFunction): void;
export declare function createTenantPrismaClient(tenantId: string, isSuperAdmin?: boolean): import(".prisma/client").PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export default tenantMiddleware;
//# sourceMappingURL=tenantMiddleware.d.ts.map