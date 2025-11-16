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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportService = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const BaseService_1 = require("./BaseService");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const EXPORT_DIR = path.join(__dirname, '../exports');
let ExportService = class ExportService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async ensureExportDir() {
        try {
            await fs_1.promises.mkdir(EXPORT_DIR, { recursive: true });
        }
        catch (error) {
            this.logError('Error creating export directory', error);
        }
    }
    async exportEventToExcel(eventId, includeDetails = false) {
        await this.ensureExportDir();
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            include: {
                contests: {
                    include: {
                        categories: true,
                    },
                },
            },
        });
        if (!event) {
            throw this.notFoundError('Event', eventId);
        }
        const filename = `event_${eventId}_${Date.now()}_${includeDetails ? 'detailed' : 'summary'}.xlsx`;
        const filepath = path.join(EXPORT_DIR, filename);
        await fs_1.promises.writeFile(filepath, 'Excel export placeholder');
        return filepath;
    }
    async exportContestResultsToCSV(contestId) {
        await this.ensureExportDir();
        const contest = await this.prisma.contest.findUnique({
            where: { id: contestId },
            include: {
                categories: true,
            },
        });
        if (!contest) {
            throw this.notFoundError('Contest', contestId);
        }
        const filename = `contest_${contestId}_${Date.now()}.csv`;
        const filepath = path.join(EXPORT_DIR, filename);
        await fs_1.promises.writeFile(filepath, 'CSV export placeholder');
        return filepath;
    }
    async exportJudgePerformanceToXML(judgeId) {
        await this.ensureExportDir();
        const judge = await this.prisma.judge.findUnique({
            where: { id: judgeId },
        });
        if (!judge) {
            throw this.notFoundError('Judge', judgeId);
        }
        const filename = `judge_${judgeId}_${Date.now()}.xml`;
        const filepath = path.join(EXPORT_DIR, filename);
        await fs_1.promises.writeFile(filepath, '<export>XML export placeholder</export>');
        return filepath;
    }
    async exportSystemAnalyticsToPDF(startDate, endDate) {
        await this.ensureExportDir();
        const dateRange = startDate && endDate ? `${startDate}_to_${endDate}` : 'all_time';
        const filename = `analytics_${dateRange}_${Date.now()}.pdf`;
        const filepath = path.join(EXPORT_DIR, filename);
        await fs_1.promises.writeFile(filepath, 'PDF export placeholder');
        return filepath;
    }
    async getExportHistory(userId, limit = 50) {
        const exports = await this.prisma.report?.findMany({
            where: {
                generatedBy: userId,
                type: {
                    in: ['EXCEL_EXPORT', 'CSV_EXPORT', 'XML_EXPORT', 'PDF_EXPORT'],
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        }) || [];
        return {
            exports,
            message: 'Export history retrieved successfully',
        };
    }
};
exports.ExportService = ExportService;
exports.ExportService = ExportService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], ExportService);
//# sourceMappingURL=ExportService.js.map