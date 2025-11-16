import { Request, Response, NextFunction } from 'express';
export declare class ExportController {
    private exportService;
    constructor();
    exportEventToExcel: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    exportContestResultsToCSV: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    exportJudgePerformanceToXML: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    exportSystemAnalyticsToPDF: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getExportHistory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const exportEventToExcel: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const exportContestResultsToCSV: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const exportJudgePerformanceToXML: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const exportSystemAnalyticsToPDF: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getExportHistory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=exportController.d.ts.map