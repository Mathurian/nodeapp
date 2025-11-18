import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class AuditorCertificationService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getFinalCertificationStatus(categoryId: string): Promise<{
        categoryId: string;
        categoryName: any;
        canCertify: boolean;
        readyForFinalCertification: boolean;
        alreadyCertified: boolean;
        tallyCertifications: {
            required: any;
            completed: any;
            missing: number;
            certifications: any;
        };
        scoreStatus: {
            total: any;
            uncertified: any;
            completed: boolean;
        };
        auditorCertified: boolean;
        auditorCertification: {
            certifiedAt: any;
            certifiedBy: any;
        };
    }>;
    submitFinalCertification(categoryId: string, userId: string, _userRole: string, confirmations: any): Promise<any>;
    private getFinalCertificationStatusInternal;
}
//# sourceMappingURL=AuditorCertificationService.d.ts.map