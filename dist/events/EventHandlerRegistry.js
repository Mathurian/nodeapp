"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventHandlerRegistry = void 0;
const EventBusService_1 = __importStar(require("../services/EventBusService"));
const AuditEventHandler_1 = require("./handlers/AuditEventHandler");
const WebhookEventHandler_1 = require("./handlers/WebhookEventHandler");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('EventHandlerRegistry');
class EventHandlerRegistry {
    static registered = false;
    static registerAll() {
        if (this.registered) {
            logger.warn('Event handlers already registered');
            return;
        }
        logger.info('Registering event handlers...');
        Object.values(EventBusService_1.AppEventType).forEach(eventType => {
            EventBusService_1.default.subscribe(eventType, AuditEventHandler_1.AuditEventHandler.handle.bind(AuditEventHandler_1.AuditEventHandler));
        });
        Object.values(EventBusService_1.AppEventType).forEach(eventType => {
            EventBusService_1.default.subscribe(eventType, WebhookEventHandler_1.WebhookEventHandler.handle.bind(WebhookEventHandler_1.WebhookEventHandler));
        });
        this.registered = true;
        logger.info('Event handlers registered successfully');
    }
}
exports.EventHandlerRegistry = EventHandlerRegistry;
exports.default = EventHandlerRegistry;
//# sourceMappingURL=EventHandlerRegistry.js.map