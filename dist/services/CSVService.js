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
exports.CSVService = void 0;
const tsyringe_1 = require("tsyringe");
const sync_1 = require("csv-parse/sync");
const sync_2 = require("csv-stringify/sync");
const logger_1 = require("../utils/logger");
const Logger = (0, logger_1.createLogger)('CSVService');
let CSVService = class CSVService {
    constructor() {
    }
    parseCSV(fileBuffer, columns) {
        try {
            const records = (0, sync_1.parse)(fileBuffer, {
                columns: columns || true,
                skip_empty_lines: true,
                trim: true,
                bom: true,
                relaxColumnCount: true
            });
            Logger.info('CSV parsed successfully', { recordCount: records.length });
            return records;
        }
        catch (error) {
            Logger.error('CSV parse failed', { error });
            throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async validateUsersImport(csvData) {
        const result = {
            total: csvData.length,
            successful: 0,
            failed: 0,
            errors: [],
            data: []
        };
        const requiredFields = ['email', 'name', 'role'];
        const validRoles = ['ADMIN', 'BOARD', 'TALLYMASTER', 'AUDITOR', 'JUDGE', 'EMCEE', 'CONTESTANT'];
        csvData.forEach((row, index) => {
            const rowNumber = index + 2;
            let hasError = false;
            for (const field of requiredFields) {
                if (!row[field] || row[field].toString().trim() === '') {
                    result.errors.push({
                        row: rowNumber,
                        field,
                        error: 'Required field is missing or empty',
                        value: row[field]
                    });
                    hasError = true;
                }
            }
            if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
                result.errors.push({
                    row: rowNumber,
                    field: 'email',
                    error: 'Invalid email format',
                    value: row.email
                });
                hasError = true;
            }
            if (row.role && !validRoles.includes(row.role.toUpperCase())) {
                result.errors.push({
                    row: rowNumber,
                    field: 'role',
                    error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
                    value: row.role
                });
                hasError = true;
            }
            if (hasError) {
                result.failed++;
            }
            else {
                result.successful++;
                result.data.push({
                    email: row.email.toLowerCase().trim(),
                    name: row.name.trim(),
                    role: row.role.toUpperCase(),
                    phone: row.phone?.trim() || null,
                    active: row.active === 'false' || row.active === '0' ? false : true
                });
            }
        });
        Logger.info('User import validation completed', {
            total: result.total,
            successful: result.successful,
            failed: result.failed
        });
        return result;
    }
    async validateContestantsImport(csvData) {
        const result = {
            total: csvData.length,
            successful: 0,
            failed: 0,
            errors: [],
            data: []
        };
        const requiredFields = ['name', 'contestId'];
        csvData.forEach((row, index) => {
            const rowNumber = index + 2;
            let hasError = false;
            for (const field of requiredFields) {
                if (!row[field] || row[field].toString().trim() === '') {
                    result.errors.push({
                        row: rowNumber,
                        field,
                        error: 'Required field is missing or empty',
                        value: row[field]
                    });
                    hasError = true;
                }
            }
            if (row.number && isNaN(parseInt(row.number))) {
                result.errors.push({
                    row: rowNumber,
                    field: 'number',
                    error: 'Number must be a valid integer',
                    value: row.number
                });
                hasError = true;
            }
            if (hasError) {
                result.failed++;
            }
            else {
                result.successful++;
                result.data.push({
                    name: row.name.trim(),
                    number: row.number ? parseInt(row.number) : null,
                    contestId: row.contestId.trim(),
                    bio: row.bio?.trim() || null
                });
            }
        });
        Logger.info('Contestant import validation completed', {
            total: result.total,
            successful: result.successful,
            failed: result.failed
        });
        return result;
    }
    async validateJudgesImport(csvData) {
        const result = {
            total: csvData.length,
            successful: 0,
            failed: 0,
            errors: [],
            data: []
        };
        const requiredFields = ['name', 'email'];
        csvData.forEach((row, index) => {
            const rowNumber = index + 2;
            let hasError = false;
            for (const field of requiredFields) {
                if (!row[field] || row[field].toString().trim() === '') {
                    result.errors.push({
                        row: rowNumber,
                        field,
                        error: 'Required field is missing or empty',
                        value: row[field]
                    });
                    hasError = true;
                }
            }
            if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
                result.errors.push({
                    row: rowNumber,
                    field: 'email',
                    error: 'Invalid email format',
                    value: row.email
                });
                hasError = true;
            }
            if (hasError) {
                result.failed++;
            }
            else {
                result.successful++;
                result.data.push({
                    name: row.name.trim(),
                    email: row.email.toLowerCase().trim(),
                    phone: row.phone?.trim() || null,
                    bio: row.bio?.trim() || null,
                    certified: row.certified === 'true' || row.certified === '1'
                });
            }
        });
        Logger.info('Judge import validation completed', {
            total: result.total,
            successful: result.successful,
            failed: result.failed
        });
        return result;
    }
    exportToCSV(data, columns, headers) {
        try {
            const csvData = (0, sync_2.stringify)(data, {
                header: true,
                columns: columns.map((col, index) => ({
                    key: col,
                    header: headers?.[index] || col
                }))
            });
            Logger.info('CSV export completed', { recordCount: data.length });
            return csvData;
        }
        catch (error) {
            Logger.error('CSV export failed', { error });
            throw new Error(`Failed to export CSV: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    generateTemplate(type) {
        const templates = {
            users: {
                columns: ['email', 'name', 'role', 'phone', 'active'],
                sample: [
                    {
                        email: 'example@example.com',
                        name: 'John Doe',
                        role: 'JUDGE',
                        phone: '555-1234',
                        active: 'true'
                    }
                ]
            },
            contestants: {
                columns: ['name', 'number', 'contestId', 'bio'],
                sample: [
                    {
                        name: 'Jane Smith',
                        number: '1',
                        contestId: 'contest-id-here',
                        bio: 'Optional biography'
                    }
                ]
            },
            judges: {
                columns: ['name', 'email', 'phone', 'bio', 'certified'],
                sample: [
                    {
                        name: 'Judge Name',
                        email: 'judge@example.com',
                        phone: '555-5678',
                        bio: 'Optional biography',
                        certified: 'false'
                    }
                ]
            }
        };
        const template = templates[type];
        return this.exportToCSV(template.sample, template.columns);
    }
};
exports.CSVService = CSVService;
exports.CSVService = CSVService = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [])
], CSVService);
//# sourceMappingURL=CSVService.js.map