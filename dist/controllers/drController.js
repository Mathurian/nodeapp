"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRTORPO = exports.getDRDashboard = exports.getDRMetrics = exports.executeDRTest = exports.executeBackup = exports.verifyBackupTarget = exports.listBackupTargets = exports.deleteBackupTarget = exports.updateBackupTarget = exports.createBackupTarget = exports.listBackupSchedules = exports.deleteBackupSchedule = exports.updateBackupSchedule = exports.createBackupSchedule = exports.updateDRConfig = exports.getDRConfig = void 0;
const DRAutomationService_1 = require("../services/DRAutomationService");
const responseHelpers_1 = require("../utils/responseHelpers");
const getDRConfig = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        const config = await DRAutomationService_1.DRAutomationService.getDRConfig(tenantId);
        (0, responseHelpers_1.sendSuccess)(res, config);
    }
    catch (error) {
        next(error);
    }
};
exports.getDRConfig = getDRConfig;
const updateDRConfig = async (req, res, next) => {
    try {
        const { id } = req.params;
        const config = await DRAutomationService_1.DRAutomationService.updateDRConfig(id, req.body);
        (0, responseHelpers_1.sendSuccess)(res, config, 'DR configuration updated successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.updateDRConfig = updateDRConfig;
const createBackupSchedule = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        const schedule = await DRAutomationService_1.DRAutomationService.createBackupSchedule({
            ...req.body,
            tenantId
        });
        (0, responseHelpers_1.sendSuccess)(res, schedule, 'Backup schedule created successfully', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.createBackupSchedule = createBackupSchedule;
const updateBackupSchedule = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schedule = await DRAutomationService_1.DRAutomationService.updateBackupSchedule(id, req.body);
        (0, responseHelpers_1.sendSuccess)(res, schedule, 'Backup schedule updated successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.updateBackupSchedule = updateBackupSchedule;
const deleteBackupSchedule = async (req, res, next) => {
    try {
        const { id } = req.params;
        await DRAutomationService_1.DRAutomationService.deleteBackupSchedule(id);
        (0, responseHelpers_1.sendSuccess)(res, null, 'Backup schedule deleted successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteBackupSchedule = deleteBackupSchedule;
const listBackupSchedules = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        const schedules = await DRAutomationService_1.DRAutomationService.listBackupSchedules(tenantId);
        (0, responseHelpers_1.sendSuccess)(res, schedules);
    }
    catch (error) {
        next(error);
    }
};
exports.listBackupSchedules = listBackupSchedules;
const createBackupTarget = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        const target = await DRAutomationService_1.DRAutomationService.createBackupTarget({
            ...req.body,
            tenantId
        });
        (0, responseHelpers_1.sendSuccess)(res, target, 'Backup target created successfully', 201);
    }
    catch (error) {
        next(error);
    }
};
exports.createBackupTarget = createBackupTarget;
const updateBackupTarget = async (req, res, next) => {
    try {
        const { id } = req.params;
        const target = await DRAutomationService_1.DRAutomationService.updateBackupTarget(id, req.body);
        (0, responseHelpers_1.sendSuccess)(res, target, 'Backup target updated successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.updateBackupTarget = updateBackupTarget;
const deleteBackupTarget = async (req, res, next) => {
    try {
        const { id } = req.params;
        await DRAutomationService_1.DRAutomationService.deleteBackupTarget(id);
        (0, responseHelpers_1.sendSuccess)(res, null, 'Backup target deleted successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.deleteBackupTarget = deleteBackupTarget;
const listBackupTargets = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        const targets = await DRAutomationService_1.DRAutomationService.listBackupTargets(tenantId);
        (0, responseHelpers_1.sendSuccess)(res, targets);
    }
    catch (error) {
        next(error);
    }
};
exports.listBackupTargets = listBackupTargets;
const verifyBackupTarget = async (req, res, next) => {
    try {
        const { id } = req.params;
        const verified = await DRAutomationService_1.DRAutomationService.verifyBackupTarget(id);
        (0, responseHelpers_1.sendSuccess)(res, { verified }, verified ? 'Backup target verified successfully' : 'Backup target verification failed');
    }
    catch (error) {
        next(error);
    }
};
exports.verifyBackupTarget = verifyBackupTarget;
const executeBackup = async (req, res, next) => {
    try {
        const { scheduleId } = req.body;
        const result = await DRAutomationService_1.DRAutomationService.executeBackup(scheduleId);
        if (result.success) {
            (0, responseHelpers_1.sendSuccess)(res, result, 'Backup executed successfully');
        }
        else {
            res.status(500).json({ error: result.error || 'Backup failed' });
        }
    }
    catch (error) {
        next(error);
    }
};
exports.executeBackup = executeBackup;
const executeDRTest = async (req, res, next) => {
    try {
        const { backupId, testType } = req.body;
        const result = await DRAutomationService_1.DRAutomationService.executeDRTest(backupId, testType);
        (0, responseHelpers_1.sendSuccess)(res, result, 'DR test executed successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.executeDRTest = executeDRTest;
const getDRMetrics = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        const { metricType, days } = req.query;
        const metrics = await DRAutomationService_1.DRAutomationService.getDRMetrics(tenantId, metricType, days ? parseInt(days) : 30);
        (0, responseHelpers_1.sendSuccess)(res, metrics);
    }
    catch (error) {
        next(error);
    }
};
exports.getDRMetrics = getDRMetrics;
const getDRDashboard = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        const dashboard = await DRAutomationService_1.DRAutomationService.getDRDashboard(tenantId);
        (0, responseHelpers_1.sendSuccess)(res, dashboard);
    }
    catch (error) {
        next(error);
    }
};
exports.getDRDashboard = getDRDashboard;
const checkRTORPO = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        const violations = await DRAutomationService_1.DRAutomationService.checkRTORPOViolations(tenantId);
        (0, responseHelpers_1.sendSuccess)(res, violations);
    }
    catch (error) {
        next(error);
    }
};
exports.checkRTORPO = checkRTORPO;
//# sourceMappingURL=drController.js.map