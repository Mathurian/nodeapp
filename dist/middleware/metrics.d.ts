import { Request, Response, NextFunction } from 'express';
export declare const initMetrics: () => void;
export declare const metricsMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const metricsEndpoint: (req: Request, res: Response) => Promise<void>;
declare const _default: {
    initMetrics: () => void;
    metricsMiddleware: (req: Request, res: Response, next: NextFunction) => void;
    metricsEndpoint: (req: Request, res: Response) => Promise<void>;
};
export default _default;
//# sourceMappingURL=metrics.d.ts.map