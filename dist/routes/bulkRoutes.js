"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const multer_1 = __importDefault(require("multer"));
const BulkUserController_1 = require("../controllers/BulkUserController");
const BulkEventController_1 = require("../controllers/BulkEventController");
const BulkContestController_1 = require("../controllers/BulkContestController");
const BulkAssignmentController_1 = require("../controllers/BulkAssignmentController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});
const bulkUserController = tsyringe_1.container.resolve(BulkUserController_1.BulkUserController);
const bulkEventController = tsyringe_1.container.resolve(BulkEventController_1.BulkEventController);
const bulkContestController = tsyringe_1.container.resolve(BulkContestController_1.BulkContestController);
const bulkAssignmentController = tsyringe_1.container.resolve(BulkAssignmentController_1.BulkAssignmentController);
router.use(auth_1.authenticateToken);
router.use((0, auth_1.requireRole)(['ADMIN']));
router.post('/users/activate', (req, res) => bulkUserController.activateUsers(req, res));
router.post('/users/deactivate', (req, res) => bulkUserController.deactivateUsers(req, res));
router.post('/users/delete', (req, res) => bulkUserController.deleteUsers(req, res));
router.post('/users/change-role', (req, res) => bulkUserController.changeUserRoles(req, res));
router.post('/users/import', upload.single('file'), (req, res) => bulkUserController.importUsers(req, res));
router.get('/users/export', (req, res) => bulkUserController.exportUsers(req, res));
router.get('/users/template', (req, res) => bulkUserController.getImportTemplate(req, res));
router.post('/events/status', (req, res) => bulkEventController.changeEventStatus(req, res));
router.post('/events/delete', (req, res) => bulkEventController.deleteEvents(req, res));
router.post('/events/clone', (req, res) => bulkEventController.cloneEvents(req, res));
router.post('/contests/status', (req, res) => bulkContestController.changeContestStatus(req, res));
router.post('/contests/certify', (req, res) => bulkContestController.certifyContests(req, res));
router.post('/contests/delete', (req, res) => bulkContestController.deleteContests(req, res));
router.post('/assignments/create', (req, res) => bulkAssignmentController.createAssignments(req, res));
router.post('/assignments/delete', (req, res) => bulkAssignmentController.deleteAssignments(req, res));
router.post('/assignments/reassign', (req, res) => bulkAssignmentController.reassignJudges(req, res));
exports.default = router;
//# sourceMappingURL=bulkRoutes.js.map