export interface CreateTenantInput {
    name: string;
    slug: string;
    domain?: string;
    planType?: 'free' | 'pro' | 'enterprise';
    maxUsers?: number;
    maxEvents?: number;
    maxStorage?: bigint;
    settings?: any;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
}
export interface UpdateTenantInput {
    name?: string;
    slug?: string;
    domain?: string;
    planType?: 'free' | 'pro' | 'enterprise';
    subscriptionStatus?: 'active' | 'trial' | 'suspended' | 'cancelled';
    subscriptionEndsAt?: Date;
    maxUsers?: number;
    maxEvents?: number;
    maxStorage?: bigint;
    settings?: any;
}
export interface TenantUsageStats {
    tenantId: string;
    usersCount: number;
    eventsCount: number;
    contestsCount: number;
    categoriesCount: number;
    scoresCount: number;
    storageUsed: bigint;
    lastActivity?: Date;
}
export declare class TenantService {
    static createTenant(input: CreateTenantInput): Promise<any>;
    static getTenantById(tenantId: string): Promise<any>;
    static getTenantBySlug(slug: string): Promise<any>;
    static listTenants(params?: {
        skip?: number;
        take?: number;
        isActive?: boolean;
        planType?: string;
        search?: string;
    }): Promise<{
        tenants: any[];
        total: number;
    }>;
    static updateTenant(tenantId: string, input: UpdateTenantInput): Promise<any>;
    static activateTenant(tenantId: string): Promise<any>;
    static deactivateTenant(tenantId: string): Promise<any>;
    static deleteTenant(tenantId: string, hard?: boolean): Promise<void>;
    static getTenantUsage(tenantId: string): Promise<TenantUsageStats>;
    static inviteUser(tenantId: string, email: string, name: string, role: string): Promise<any>;
    static checkLimits(tenantId: string): Promise<{
        users: {
            current: number;
            max: number | null;
            exceeded: boolean;
        };
        events: {
            current: number;
            max: number | null;
            exceeded: boolean;
        };
        storage: {
            current: bigint;
            max: bigint | null;
            exceeded: boolean;
        };
    }>;
}
export default TenantService;
//# sourceMappingURL=TenantService.d.ts.map