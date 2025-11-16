declare const LOG_DIRECTORY: string;
declare const refreshLogLevels: () => Promise<void>;
declare const getLogLevel: (category?: string) => string;
declare class Logger {
    category: string;
    constructor(category?: string);
    log(level: string, message: string, meta?: any): Promise<void>;
    error(message: string, meta?: any): Promise<void>;
    warn(message: string, meta?: any): Promise<void>;
    info(message: string, meta?: any): Promise<void>;
    debug(message: string, meta?: any): Promise<void>;
}
declare const createRequestLogger: (req: any, category?: string) => {
    error: (message: string, meta?: any) => Promise<void>;
    warn: (message: string, meta?: any) => Promise<void>;
    info: (message: string, meta?: any) => Promise<void>;
    debug: (message: string, meta?: any) => Promise<void>;
    log: (level: string, message: string, meta?: any) => Promise<void>;
};
export { Logger };
export declare const logger: Logger;
export declare const createLogger: (category?: string) => Logger;
export { createRequestLogger, refreshLogLevels, getLogLevel, LOG_DIRECTORY };
//# sourceMappingURL=logger.d.ts.map