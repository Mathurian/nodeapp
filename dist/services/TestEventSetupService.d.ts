import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
export interface TestEventConfig {
    eventName?: string;
    contestCount?: number;
    categoriesPerContest?: number;
    contestantsPerCategory?: number;
    judgesPerCategory?: number;
    tallyMastersPerContest?: number;
    auditorsPerContest?: number;
    boardUsers?: number;
    organizers?: number;
    assignJudgesToCategories?: boolean;
    assignContestantsToCategories?: boolean;
}
export declare class TestEventSetupService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    createTestEvent(config: TestEventConfig, userId: string, userRole: string): Promise<{
        eventId: string;
        message: string;
    }>;
}
//# sourceMappingURL=TestEventSetupService.d.ts.map