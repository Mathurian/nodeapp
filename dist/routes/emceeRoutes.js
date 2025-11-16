"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const emceeController_1 = require("../controllers/emceeController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const config_1 = require("../utils/config");
const router = express_1.default.Router();
const emceeScriptStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/emcee/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'script-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const emceeScriptUpload = (0, multer_1.default)({
    storage: emceeScriptStorage,
    limits: { fileSize: config_1.maxFileSize },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'), false);
        }
    }
});
router.get('/scripts/:scriptId/view', emceeController_1.serveScriptFile);
router.use(auth_1.authenticateToken);
router.use((0, auth_1.requireRole)(['ADMIN', 'EMCEE', 'ORGANIZER', 'BOARD']));
router.get('/stats', emceeController_1.getStats);
router.get('/scripts', emceeController_1.getScripts);
router.get('/scripts', emceeController_1.getScripts);
router.get('/scripts/:scriptId', emceeController_1.getScript);
router.get('/scripts/:scriptId/view-url', emceeController_1.getFileViewUrl);
router.post('/scripts', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), emceeScriptUpload.single('script'), (0, errorHandler_1.logActivity)('UPLOAD_EMCEE_SCRIPT', 'EMCEE'), emceeController_1.uploadScript);
router.put('/scripts/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('UPDATE_EMCEE_SCRIPT', 'EMCEE'), emceeController_1.updateScript);
router.delete('/scripts/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('DELETE_EMCEE_SCRIPT', 'EMCEE'), emceeController_1.deleteScript);
router.patch('/scripts/:id/toggle', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('TOGGLE_EMCEE_SCRIPT', 'EMCEE'), emceeController_1.toggleScript);
router.get('/contestant-bios', emceeController_1.getContestantBios);
router.get('/judge-bios', emceeController_1.getJudgeBios);
router.get('/events', emceeController_1.getEvents);
router.get('/events/:eventId', emceeController_1.getEvent);
router.get('/contests', emceeController_1.getContests);
router.get('/contests/:contestId', emceeController_1.getContest);
exports.default = router;
module.exports = router;
//# sourceMappingURL=emceeRoutes.js.map