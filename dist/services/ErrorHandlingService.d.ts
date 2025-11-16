import { BaseService } from './BaseService';
export declare class ErrorHandlingService extends BaseService {
    logError(error: any, context?: any): {
        logged: boolean;
        timestamp: Date;
        error: string;
    };
    getErrorStats(): {
        total: number;
        last24Hours: number;
        byType: {};
    };
}
//# sourceMappingURL=ErrorHandlingService.d.ts.map