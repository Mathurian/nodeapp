import { Request, Response, NextFunction } from 'express';
export declare class WinnersController {
    private winnerService;
    constructor();
    getWinnersByCategory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getWinnersByContest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    signWinners: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getSignatureStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCertificationProgress: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getRoleCertificationStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    certifyScores: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getWinners: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const getWinners: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getWinnersByCategory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getWinnersByContest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const signWinners: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getSignatureStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCertificationProgress: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getRoleCertificationStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const certifyScores: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=winnersController.d.ts.map