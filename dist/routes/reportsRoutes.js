"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reportsController_1 = require("../controllers/reportsController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const prisma_1 = __importDefault(require("../utils/prisma"));
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/templates', reportsController_1.getTemplates);
router.post('/templates', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('CREATE_REPORT_TEMPLATE', 'REPORT'), reportsController_1.createTemplate);
router.post('/generate', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD', 'JUDGE']), (0, errorHandler_1.logActivity)('GENERATE_REPORT', 'REPORT'), reportsController_1.generateReport);
router.get('/', reportsController_1.getReportInstances);
router.get('/instances', reportsController_1.getReportInstances);
router.delete('/instances/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('DELETE_REPORT_INSTANCE', 'REPORT'), reportsController_1.deleteReportInstance);
router.post('/send-email', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR']), (0, errorHandler_1.logActivity)('EMAIL_REPORT', 'REPORT'), reportsController_1.sendReportEmail);
router.get('/:id/download', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD', 'JUDGE']), async (req, res) => {
    try {
        const { id } = req.params;
        const reportInstance = await prisma_1.default.reportInstance.findUnique({
            where: { id }
        });
        if (!reportInstance) {
            return res.status(404).json({ error: 'Report not found' });
        }
        let parsedData = {};
        try {
            if (typeof reportInstance.data === 'string' && reportInstance.data !== '{}' && reportInstance.data.trim() !== '') {
                parsedData = JSON.parse(reportInstance.data);
            }
            else if (reportInstance.data && typeof reportInstance.data === 'object') {
                parsedData = reportInstance.data;
            }
            else {
                parsedData = {
                    message: 'No report data available',
                    reportType: reportInstance.type,
                    generatedAt: reportInstance.generatedAt
                };
            }
        }
        catch (parseError) {
            console.error('Failed to parse report data:', parseError);
            parsedData = {
                error: 'Failed to parse report data'
            };
        }
        res.json({
            data: {
                id: reportInstance.id,
                name: reportInstance.name,
                type: reportInstance.type,
                format: reportInstance.format || 'PDF',
                generatedAt: reportInstance.generatedAt,
                generatedBy: reportInstance.generatedById || 'System',
                data: parsedData
            }
        });
    }
    catch (error) {
        console.error('Download report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/:id/export/pdf', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD', 'JUDGE']), (0, errorHandler_1.logActivity)('EXPORT_REPORT_PDF', 'REPORT'), reportsController_1.exportToPDF);
router.post('/:id/export/excel', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD', 'JUDGE']), (0, errorHandler_1.logActivity)('EXPORT_REPORT_EXCEL', 'REPORT'), reportsController_1.exportToExcel);
router.post('/:id/export/csv', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD', 'JUDGE']), (0, errorHandler_1.logActivity)('EXPORT_REPORT_CSV', 'REPORT'), reportsController_1.exportToCSV);
exports.default = router;
module.exports = router;
//# sourceMappingURL=reportsRoutes.js.map