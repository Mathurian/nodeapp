"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsService = void 0;
const tsyringe_1 = require("tsyringe");
const prom_client_1 = require("prom-client");
const logger_1 = require("../utils/logger");
let MetricsService = class MetricsService {
    register;
    httpRequestDuration;
    httpRequestTotal;
    httpRequestErrors;
    activeConnections;
    databaseQueryDuration;
    cacheHitRate;
    cacheMissRate;
    log = (0, logger_1.createLogger)('metrics');
    constructor() {
        this.register = new prom_client_1.Registry();
        (0, prom_client_1.collectDefaultMetrics)({ register: this.register });
        this.httpRequestDuration = new prom_client_1.Histogram({
            name: 'http_request_duration_seconds',
            help: 'Duration of HTTP requests in seconds',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
            registers: [this.register],
        });
        this.httpRequestTotal = new prom_client_1.Counter({
            name: 'http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status_code'],
            registers: [this.register],
        });
        this.httpRequestErrors = new prom_client_1.Counter({
            name: 'http_request_errors_total',
            help: 'Total number of HTTP request errors',
            labelNames: ['method', 'route', 'error_type'],
            registers: [this.register],
        });
        this.activeConnections = new prom_client_1.Gauge({
            name: 'active_connections',
            help: 'Number of active connections',
            registers: [this.register],
        });
        this.databaseQueryDuration = new prom_client_1.Histogram({
            name: 'database_query_duration_seconds',
            help: 'Duration of database queries in seconds',
            labelNames: ['operation', 'table'],
            buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
            registers: [this.register],
        });
        this.cacheHitRate = new prom_client_1.Counter({
            name: 'cache_hits_total',
            help: 'Total number of cache hits',
            labelNames: ['cache_key'],
            registers: [this.register],
        });
        this.cacheMissRate = new prom_client_1.Counter({
            name: 'cache_misses_total',
            help: 'Total number of cache misses',
            labelNames: ['cache_key'],
            registers: [this.register],
        });
        this.log.info('Metrics service initialized');
    }
    recordHttpRequest(method, route, statusCode, duration) {
        const labels = {
            method: method.toUpperCase(),
            route: this.normalizeRoute(route),
            status_code: statusCode.toString(),
        };
        this.httpRequestDuration.observe(labels, duration / 1000);
        this.httpRequestTotal.inc(labels);
    }
    recordHttpError(method, route, errorType) {
        this.httpRequestErrors.inc({
            method: method.toUpperCase(),
            route: this.normalizeRoute(route),
            error_type: errorType,
        });
    }
    recordDatabaseQuery(operation, table, duration) {
        this.databaseQueryDuration.observe({ operation, table }, duration / 1000);
    }
    recordCacheHit(cacheKey) {
        this.cacheHitRate.inc({ cache_key: cacheKey });
    }
    recordCacheMiss(cacheKey) {
        this.cacheMissRate.inc({ cache_key: cacheKey });
    }
    setActiveConnections(count) {
        this.activeConnections.set(count);
    }
    incrementActiveConnections() {
        this.activeConnections.inc();
    }
    decrementActiveConnections() {
        this.activeConnections.dec();
    }
    async getMetrics() {
        return this.register.metrics();
    }
    async getMetricsAsJson() {
        return this.register.getMetricsAsJSON();
    }
    resetMetrics() {
        this.register.resetMetrics();
    }
    normalizeRoute(route) {
        return route
            .replace(/\/[0-9a-f-]{36}/gi, '/:id')
            .replace(/\/\d+/g, '/:id')
            .replace(/\/api\//g, '/api/')
            .toLowerCase();
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [])
], MetricsService);
exports.default = MetricsService;
//# sourceMappingURL=MetricsService.js.map