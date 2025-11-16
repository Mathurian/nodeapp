import { Request, Response, NextFunction } from 'express';
export interface VirusScanMiddlewareOptions {
    deleteOnInfection?: boolean;
    blockOnError?: boolean;
    scanBuffers?: boolean;
}
export declare const virusScanMiddleware: (options?: VirusScanMiddlewareOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const scanSingleFile: (options?: VirusScanMiddlewareOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const scanMultipleFiles: (options?: VirusScanMiddlewareOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const strictVirusScan: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const lenientVirusScan: (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    virusScanMiddleware: (options?: VirusScanMiddlewareOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
    scanSingleFile: (options?: VirusScanMiddlewareOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
    scanMultipleFiles: (options?: VirusScanMiddlewareOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
    strictVirusScan: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    lenientVirusScan: (req: Request, res: Response, next: NextFunction) => Promise<void>;
};
export default _default;
//# sourceMappingURL=virusScanMiddleware.d.ts.map