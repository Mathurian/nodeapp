import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
export declare class DataWipeService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    wipeAllData(userId: string, userRole: string, confirmation: string): Promise<void>;
    wipeEventData(eventId: string, userId: string, userRole: string): Promise<void>;
}
//# sourceMappingURL=DataWipeService.d.ts.map