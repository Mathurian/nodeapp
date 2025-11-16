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
        gender: string;
        pronouns: string;
        bio: string;
        imagePath: string;
        contestantNumber: number;
        contestContestants: {
            contest: {
                name: string;
                id: string;
                event: {
                    name: string;
                    id: string;
                };
            };
        }[];
        categoryContestants: {
            category: {
                name: string;
                id: string;
            };
        }[];
    }[]>;
    getJudgeBios(filters: BioQueryFilters): Promise<{
        name: string;
        id: string;
        isHeadJudge: boolean;
        gender: string;
        pronouns: string;
        bio: string;
        imagePath: string;
        contestJudges: {
            contest: {
                name: string;
                id: string;
                event: {
                    name: string;
                    id: string;
                };
            };
        }[];
        categoryJudges: {
            category: {
                name: string;
                id: string;
            };
        }[];
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