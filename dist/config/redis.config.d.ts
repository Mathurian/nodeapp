import { RedisOptions } from 'ioredis';
export type RedisMode = 'docker' | 'native' | 'socket' | 'memory' | 'disabled';
export interface RedisConfig {
    enabled: boolean;
    mode: RedisMode;
    host: string;
    port: number;
    path?: string;
    password?: string;
    db?: number;
    keyPrefix?: string;
    retryStrategy?: (times: number) => number | void;
    enableOfflineQueue?: boolean;
    maxRetriesPerRequest?: number;
    connectTimeout?: number;
    lazyConnect?: boolean;
    showFriendlyErrorStack?: boolean;
    fallbackToMemory?: boolean;
}
export declare const detectRedisMode: () => RedisMode;
export declare const getRedisConfig: () => RedisConfig;
export declare const getRedisOptions: () => RedisOptions;
export declare const CacheTTL: {
    readonly VERY_SHORT: 60;
    readonly SHORT: 300;
    readonly MEDIUM: 900;
    readonly LONG: 3600;
    readonly VERY_LONG: 86400;
    readonly WEEK: 604800;
};
export declare const CacheNamespace: {
    readonly USER: "user";
    readonly EVENT: "event";
    readonly CONTEST: "contest";
    readonly CATEGORY: "category";
    readonly SCORE: "score";
    readonly JUDGE: "judge";
    readonly CONTESTANT: "contestant";
    readonly ASSIGNMENT: "assignment";
    readonly SETTINGS: "settings";
    readonly SESSION: "session";
    readonly RATE_LIMIT: "rate_limit";
    readonly REPORT: "report";
    readonly TEMPLATE: "template";
    readonly CERTIFICATION: "certification";
};
export declare const CacheConfig: {
    readonly user: {
        readonly ttl: 3600;
        readonly invalidateOn: readonly ["user:update", "user:delete"];
    };
    readonly event: {
        readonly ttl: 900;
        readonly invalidateOn: readonly ["event:update", "event:delete"];
    };
    readonly contest: {
        readonly ttl: 900;
        readonly invalidateOn: readonly ["contest:update", "contest:delete"];
    };
    readonly category: {
        readonly ttl: 900;
        readonly invalidateOn: readonly ["category:update", "category:delete"];
    };
    readonly score: {
        readonly ttl: 300;
        readonly invalidateOn: readonly ["score:update", "score:delete"];
    };
    readonly judge: {
        readonly ttl: 3600;
        readonly invalidateOn: readonly ["judge:update", "judge:delete"];
    };
    readonly contestant: {
        readonly ttl: 3600;
        readonly invalidateOn: readonly ["contestant:update", "contestant:delete"];
    };
    readonly assignment: {
        readonly ttl: 900;
        readonly invalidateOn: readonly ["assignment:update", "assignment:delete"];
    };
    readonly settings: {
        readonly ttl: 86400;
        readonly invalidateOn: readonly ["settings:update"];
    };
    readonly session: {
        readonly ttl: 86400;
        readonly invalidateOn: readonly ["session:invalidate"];
    };
    readonly rate_limit: {
        readonly ttl: 300;
        readonly invalidateOn: readonly [];
    };
    readonly report: {
        readonly ttl: 900;
        readonly invalidateOn: readonly ["report:regenerate"];
    };
    readonly template: {
        readonly ttl: 86400;
        readonly invalidateOn: readonly ["template:update", "template:delete"];
    };
    readonly certification: {
        readonly ttl: 3600;
        readonly invalidateOn: readonly ["certification:update"];
    };
};
declare const _default: {
    getRedisConfig: () => RedisConfig;
    getRedisOptions: () => RedisOptions;
    CacheTTL: {
        readonly VERY_SHORT: 60;
        readonly SHORT: 300;
        readonly MEDIUM: 900;
        readonly LONG: 3600;
        readonly VERY_LONG: 86400;
        readonly WEEK: 604800;
    };
    CacheNamespace: {
        readonly USER: "user";
        readonly EVENT: "event";
        readonly CONTEST: "contest";
        readonly CATEGORY: "category";
        readonly SCORE: "score";
        readonly JUDGE: "judge";
        readonly CONTESTANT: "contestant";
        readonly ASSIGNMENT: "assignment";
        readonly SETTINGS: "settings";
        readonly SESSION: "session";
        readonly RATE_LIMIT: "rate_limit";
        readonly REPORT: "report";
        readonly TEMPLATE: "template";
        readonly CERTIFICATION: "certification";
    };
    CacheConfig: {
        readonly user: {
            readonly ttl: 3600;
            readonly invalidateOn: readonly ["user:update", "user:delete"];
        };
        readonly event: {
            readonly ttl: 900;
            readonly invalidateOn: readonly ["event:update", "event:delete"];
        };
        readonly contest: {
            readonly ttl: 900;
            readonly invalidateOn: readonly ["contest:update", "contest:delete"];
        };
        readonly category: {
            readonly ttl: 900;
            readonly invalidateOn: readonly ["category:update", "category:delete"];
        };
        readonly score: {
            readonly ttl: 300;
            readonly invalidateOn: readonly ["score:update", "score:delete"];
        };
        readonly judge: {
            readonly ttl: 3600;
            readonly invalidateOn: readonly ["judge:update", "judge:delete"];
        };
        readonly contestant: {
            readonly ttl: 3600;
            readonly invalidateOn: readonly ["contestant:update", "contestant:delete"];
        };
        readonly assignment: {
            readonly ttl: 900;
            readonly invalidateOn: readonly ["assignment:update", "assignment:delete"];
        };
        readonly settings: {
            readonly ttl: 86400;
            readonly invalidateOn: readonly ["settings:update"];
        };
        readonly session: {
            readonly ttl: 86400;
            readonly invalidateOn: readonly ["session:invalidate"];
        };
        readonly rate_limit: {
            readonly ttl: 300;
            readonly invalidateOn: readonly [];
        };
        readonly report: {
            readonly ttl: 900;
            readonly invalidateOn: readonly ["report:regenerate"];
        };
        readonly template: {
            readonly ttl: 86400;
            readonly invalidateOn: readonly ["template:update", "template:delete"];
        };
        readonly certification: {
            readonly ttl: 3600;
            readonly invalidateOn: readonly ["certification:update"];
        };
    };
};
export default _default;
//# sourceMappingURL=redis.config.d.ts.map