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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowService = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../utils/logger");
const EventBusService_1 = __importStar(require("./EventBusService"));
const logger = (0, logger_1.createLogger)('WorkflowService');
class WorkflowService {
    static async createTemplate(input) {
        try {
            const { steps, ...templateData } = input;
            const template = await database_1.default.workflowTemplate.create({
                data: {
                    ...templateData,
                    tenantId: templateData.tenantId || ''
                }
            });
            logger.info(`Created workflow template: ${template.name}`);
            return template;
        }
        catch (error) {
            logger.error('Error creating workflow template:', error);
            throw error;
        }
    }
    static async getTemplate(id) {
        try {
            return await database_1.default.workflowTemplate.findUnique({
                where: { id }
            });
        }
        catch (error) {
            logger.error('Error getting workflow template:', error);
            throw error;
        }
    }
    static async listTemplates(tenantId, type) {
        try {
            return await database_1.default.workflowTemplate.findMany({
                where: {
                    ...(tenantId && { tenantId }),
                    isActive: true
                },
                orderBy: { createdAt: 'desc' }
            });
        }
        catch (error) {
            logger.error('Error listing workflow templates:', error);
            throw error;
        }
    }
    static async startWorkflow(workflowId, tenantId, entityType, entityId) {
        try {
            const instance = await database_1.default.workflowInstance.create({
                data: {
                    templateId: workflowId,
                    tenantId,
                    entityType,
                    entityId,
                    status: 'active'
                }
            });
            logger.info(`Started workflow instance for ${entityType} ${entityId}`);
            await EventBusService_1.default.publish(EventBusService_1.AppEventType.USER_CREATED, { workflowId: instance.id, entityType, entityId }, { source: 'WorkflowService' });
            return instance;
        }
        catch (error) {
            logger.error('Error starting workflow:', error);
            throw error;
        }
    }
    static async advanceWorkflow(instanceId, userId, approvalStatus, comments) {
        try {
            const instance = await database_1.default.workflowInstance.findUnique({
                where: { id: instanceId }
            });
            if (!instance) {
                throw new Error(`Workflow instance ${instanceId} not found`);
            }
            if (approvalStatus === 'rejected') {
                await database_1.default.workflowInstance.update({
                    where: { id: instanceId },
                    data: { status: 'CANCELLED', completedAt: new Date() }
                });
                logger.info(`Workflow ${instanceId} rejected`);
                return instance;
            }
            await database_1.default.workflowInstance.update({
                where: { id: instanceId },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date()
                }
            });
            logger.info(`Workflow ${instanceId} completed`);
            return instance;
        }
        catch (error) {
            logger.error('Error advancing workflow:', error);
            throw error;
        }
    }
    static async getInstance(id) {
        try {
            return await database_1.default.workflowInstance.findUnique({
                where: { id }
            });
        }
        catch (error) {
            logger.error('Error getting workflow instance:', error);
            throw error;
        }
    }
    static async listInstancesForEntity(tenantId, entityType, entityId) {
        try {
            return await database_1.default.workflowInstance.findMany({
                where: { tenantId, entityType, entityId },
                orderBy: { startedAt: 'desc' }
            });
        }
        catch (error) {
            logger.error('Error listing workflow instances:', error);
            throw error;
        }
    }
}
exports.WorkflowService = WorkflowService;
exports.default = WorkflowService;
//# sourceMappingURL=WorkflowService.js.map