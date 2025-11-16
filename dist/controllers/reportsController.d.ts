import { Request, Response, NextFunction } from 'express';
export declare class ReportsController {
    private generationService;
    private exportService;
    private templateService;
    private emailService;
    private instanceService;
    constructor();
    getTemplates: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
    createTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    generateReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    generateContestantReports: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getReportInstances: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteReportInstance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    exportToPDF: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    exportToExcel: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    exportToCSV: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    private getReportData;
    sendReportEmail: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const getTemplates: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const createTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const generateReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const generateContestantReports: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getReportInstances: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteReportInstance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const exportToPDF: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const exportToExcel: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const exportToCSV: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const sendReportEmail: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=reportsController.d.ts.map