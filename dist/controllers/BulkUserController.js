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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkUserController = void 0;
const tsyringe_1 = require("tsyringe");
const BulkOperationService_1 = require("../services/BulkOperationService");
const CSVService_1 = require("../services/CSVService");
const UserService_1 = require("../services/UserService");
const logger_1 = require("../utils/logger");
const Logger = (0, logger_1.createLogger)('BulkUserController');
let BulkUserController = class BulkUserController {
    bulkOperationService;
    csvService;
    userService;
    constructor(bulkOperationService, csvService, userService) {
        this.bulkOperationService = bulkOperationService;
        this.csvService = csvService;
        this.userService = userService;
    }
    async activateUsers(req, res) {
        try {
            const { userIds } = req.body;
            if (!Array.isArray(userIds) || userIds.length === 0) {
                res.status(400).json({ error: 'userIds array is required' });
                return;
            }
            const result = await this.bulkOperationService.executeBulkOperation(async (userId) => {
                await this.userService.updateUser(userId, { isActive: true });
            }, userIds);
            Logger.info('Bulk activate users completed', { result, userId: req.user?.id });
            res.json({
                message: 'Bulk activate completed',
                result
            });
        }
        catch (error) {
            Logger.error('Bulk activate users failed', { error });
            res.status(500).json({
                error: 'Failed to activate users',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async deactivateUsers(req, res) {
        try {
            const { userIds } = req.body;
            if (!Array.isArray(userIds) || userIds.length === 0) {
                res.status(400).json({ error: 'userIds array is required' });
                return;
            }
            const result = await this.bulkOperationService.executeBulkOperation(async (userId) => {
                await this.userService.updateUser(userId, { isActive: false });
            }, userIds);
            Logger.info('Bulk deactivate users completed', { result, userId: req.user?.id });
            res.json({
                message: 'Bulk deactivate completed',
                result
            });
        }
        catch (error) {
            Logger.error('Bulk deactivate users failed', { error });
            res.status(500).json({
                error: 'Failed to deactivate users',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async deleteUsers(req, res) {
        try {
            const { userIds } = req.body;
            if (!Array.isArray(userIds) || userIds.length === 0) {
                res.status(400).json({ error: 'userIds array is required' });
                return;
            }
            if (userIds.includes(req.user.id)) {
                res.status(400).json({ error: 'Cannot delete your own account' });
                return;
            }
            const result = await this.bulkOperationService.executeBulkOperation(async (userId) => {
                await this.userService.deleteUser(userId);
            }, userIds);
            Logger.info('Bulk delete users completed', { result, userId: req.user?.id });
            res.json({
                message: 'Bulk delete completed',
                result
            });
        }
        catch (error) {
            Logger.error('Bulk delete users failed', { error });
            res.status(500).json({
                error: 'Failed to delete users',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async changeUserRoles(req, res) {
        try {
            const { userIds, role } = req.body;
            if (!Array.isArray(userIds) || userIds.length === 0) {
                res.status(400).json({ error: 'userIds array is required' });
                return;
            }
            if (!role) {
                res.status(400).json({ error: 'role is required' });
                return;
            }
            const validRoles = ['ADMIN', 'BOARD', 'TALLYMASTER', 'AUDITOR', 'JUDGE', 'EMCEE', 'CONTESTANT'];
            if (!validRoles.includes(role)) {
                res.status(400).json({
                    error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
                });
                return;
            }
            if (userIds.includes(req.user.id)) {
                res.status(400).json({ error: 'Cannot change your own role' });
                return;
            }
            const result = await this.bulkOperationService.executeBulkOperation(async (userId) => {
                await this.userService.updateUser(userId, { role });
            }, userIds);
            Logger.info('Bulk change role completed', { result, role, userId: req.user?.id });
            res.json({
                message: 'Bulk role change completed',
                result
            });
        }
        catch (error) {
            Logger.error('Bulk change role failed', { error });
            res.status(500).json({
                error: 'Failed to change user roles',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async importUsers(req, res) {
        try {
            if (!req.file) {
                res.status(400).json({ error: 'CSV file is required' });
                return;
            }
            const csvData = this.csvService.parseCSV(req.file.buffer);
            const validationResult = await this.csvService.validateUsersImport(csvData);
            if (validationResult.failed > 0) {
                res.status(400).json({
                    error: 'CSV validation failed',
                    result: validationResult
                });
                return;
            }
            const importResult = await this.bulkOperationService.executeBulkOperation(async (userData) => {
                await this.userService.createUser(userData);
            }, validationResult.data);
            Logger.info('User import completed', { result: importResult, userId: req.user?.id });
            res.json({
                message: 'User import completed',
                validation: validationResult,
                import: importResult
            });
        }
        catch (error) {
            Logger.error('User import failed', { error });
            res.status(500).json({
                error: 'Failed to import users',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async exportUsers(req, res) {
        try {
            const { active, role } = req.query;
            const users = await this.userService.getAllUsers();
            const filteredUsers = users.filter(u => {
                if (active !== undefined && u.isActive !== (active === 'true'))
                    return false;
                if (role && u.role !== role)
                    return false;
                return true;
            });
            const csv = this.csvService.exportToCSV(filteredUsers.map(u => ({
                id: u.id,
                email: u.email,
                name: u.name,
                role: u.role,
                phone: u.phone || '',
                active: u.isActive,
                createdAt: u.createdAt
            })), ['id', 'email', 'name', 'role', 'phone', 'active', 'createdAt'], ['ID', 'Email', 'Name', 'Role', 'Phone', 'Active', 'Created At']);
            Logger.info('User export completed', { count: filteredUsers.length, userId: req.user?.id });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');
            res.send(csv);
        }
        catch (error) {
            Logger.error('User export failed', { error });
            res.status(500).json({
                error: 'Failed to export users',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async getImportTemplate(req, res) {
        try {
            const template = this.csvService.generateTemplate('users');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=users-import-template.csv');
            res.send(template);
        }
        catch (error) {
            Logger.error('Get template failed', { error });
            res.status(500).json({
                error: 'Failed to generate template',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
};
exports.BulkUserController = BulkUserController;
exports.BulkUserController = BulkUserController = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(BulkOperationService_1.BulkOperationService)),
    __param(1, (0, tsyringe_1.inject)(CSVService_1.CSVService)),
    __param(2, (0, tsyringe_1.inject)(UserService_1.UserService)),
    __metadata("design:paramtypes", [BulkOperationService_1.BulkOperationService,
        CSVService_1.CSVService,
        UserService_1.UserService])
], BulkUserController);
//# sourceMappingURL=BulkUserController.js.map