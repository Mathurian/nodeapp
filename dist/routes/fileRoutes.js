"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fileController_1 = require("../controllers/fileController");
const auth_1 = require("../middleware/auth");
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, process.env.UPLOAD_DIR || 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', fileController_1.getAllFiles);
router.get('/stats', fileController_1.getFileStats);
exports.default = router;
module.exports = router;
//# sourceMappingURL=fileRoutes.js.map