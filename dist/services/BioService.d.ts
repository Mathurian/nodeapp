import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
interface BioQueryFilters {
    eventId?: string;
    contestId?: string;
    categoryId?: string;
}
interface UpdateBioDto {
    bio?: string;
    imagePath?: string;
}
export declare class BioService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getContestantBios(filters: BioQueryFilters): Promise<{
        name: string;
        id: string;
        email: string | null;
        gender: string | null;
        pronouns: string | null;
        contestantNumber: number | null;
        bio: string | null;
        imagePath: string | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
    }[]>;
    getJudgeBios(filters: BioQueryFilters): Promise<{
        name: string;
        id: string;
        email: string | null;
        gender: string | null;
        pronouns: string | null;
        bio: string | null;
        imagePath: string | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isHeadJudge: boolean;
    }[]>;
    updateContestantBio(contestantId: string, data: UpdateBioDto): Promise<{
        name: string;
        id: string;
        bio: string;
        imagePath: string;
    }>;
    updateJudgeBio(judgeId: string, data: UpdateBioDto): Promise<{
        name: string;
        id: string;
        bio: string;
        imagePath: string;
    }>;
}
export {};
//# sourceMappingURL=BioService.d.ts.map