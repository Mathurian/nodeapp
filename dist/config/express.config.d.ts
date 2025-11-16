import { Application } from 'express';
export declare const parseAllowedOrigins: () => string[];
export declare const isAllowedOrigin: (origin: string | undefined, allowedOrigins: string[]) => boolean;
export declare const createCorsOptions: (allowedOrigins: string[]) => {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void;
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
};
export declare const buildConnectSrc: (allowedOrigins: string[]) => string[];
export declare const configureMiddleware: (app: Application, allowedOrigins: string[]) => void;
//# sourceMappingURL=express.config.d.ts.map