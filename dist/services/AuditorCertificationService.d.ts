import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class AuditorCertificationService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getFinalCertificationStatus(categoryId: string): Promise<{
        categoryId: string;
        categoryName: string;
        canCertify: boolean;
        readyForFinalCertification: boolean;
        alreadyCertified: boolean;
        tallyCertifications: {
            required: number;
            completed: number;
            missing: number;
            certifications: {
                id: string;
                role: string;
                tenantId: string;
                categoryId: string;
                certifiedAt: Date;
                userId: string;
                comments: string | null;
                signatureName: string | null;
            }[];
        };
        scoreStatus: {
            total: number;
            uncertified: number;
            completed: boolean;
        };
        auditorCertified: boolean;
        auditorCertification: {
            certifiedAt: Date;
            certifiedBy: string;
        };
    }>;
    submitFinalCertification(categoryId: string, userId: string, _userRole: string, confirmations: any): Promise<{
        id: string;
        role: string;
        tenantId: string;
        categoryId: string;
        certifiedAt: Date;
        userId: string;
        comments: string | null;
        signatureName: string | null;
    }>;
    private getFinalCertificationStatusInternal;
}
//# sourceMappingURL=AuditorCertificationService.d.ts.map