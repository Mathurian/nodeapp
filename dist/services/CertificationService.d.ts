import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class CertificationService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getOverallStatus(eventId: string): Promise<{
        event: any;
        contests: any[];
    }>;
    certifyAll(eventId: string, _userId: string, _userRole: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
//# sourceMappingURL=CertificationService.d.ts.map