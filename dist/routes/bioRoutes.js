"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
const auth_1 = require("../middleware/auth");
const bioController_1 = require("../controllers/bioController");
const errorHandler_1 = require("../middleware/errorHandler");
const config_1 = require("../utils/config");
const bioImageStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/bios/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'bio-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const bioImageUpload = (0, multer_1.default)({
    storage: bioImageStorage,
    limits: { fileSize: config_1.maxFileSize },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
        }
    }
});
router.use(auth_1.authenticateToken);
router.get('/contestants', bioController_1.getContestantBios);
router.get('/judges', bioController_1.getJudgeBios);
router.put('/contestants/:contestantId', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), bioImageUpload.single('image'), (0, errorHandler_1.logActivity)('UPDATE_CONTESTANT_BIO', 'BIO'), bioController_1.updateContestantBio);
router.put('/judges/:judgeId', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), bioImageUpload.single('image'), (0, errorHandler_1.logActivity)('UPDATE_JUDGE_BIO', 'BIO'), bioController_1.updateJudgeBio);
exports.default = router;
module.exports = router;
//# sourceMappingURL=bioRoutes.js.map