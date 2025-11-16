import { Request, Response, NextFunction } from 'express';
export declare class PrintController {
    private printService;
    constructor();
    getPrintTemplates: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createPrintTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updatePrintTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deletePrintTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    printEventReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    printContestResults: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    printJudgePerformance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    printContestantReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    printJudgeReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    printCategoryReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    printContestReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    printArchivedContestReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const getPrintTemplates: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const createPrintTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updatePrintTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deletePrintTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const printEventReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const printContestResults: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const printJudgePerformance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const printContestantReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const printJudgeReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const printCategoryReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const printContestReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const printArchivedContestReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=printController.d.ts.map