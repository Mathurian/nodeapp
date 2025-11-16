import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
export interface BulkCertificationResetDTO {
    eventId?: string;
    contestId?: string;
    categoryId?: string;
    resetAll?: boolean;
}
export declare class BulkCertificationResetService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    resetCertifications(dto: BulkCertificationResetDTO, userId: string, userRole: string): Promise<{
        resetCount: number;
        message: string;
    }>;
}
//# sourceMappingURL=BulkCertificationResetService.d.ts.map