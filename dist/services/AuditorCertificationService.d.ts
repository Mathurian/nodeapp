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
                categoryId: string;
                signatureName: string | null;
                certifiedAt: Date;
                role: string;
                userId: string;
                comments: string | null;
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
    submitFinalCertification(categoryId: string, userId: string, userRole: string, confirmations: any): Promise<{
        id: string;
        categoryId: string;
        signatureName: string | null;
        certifiedAt: Date;
        role: string;
        userId: string;
        comments: string | null;
    }>;
    private getFinalCertificationStatusInternal;
}
//# sourceMappingURL=AuditorCertificationService.d.ts.map