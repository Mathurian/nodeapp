"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const uploadController_1 = require("../controllers/uploadController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const config_1 = require("../utils/config");
const router = express_1.default.Router();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: config_1.maxFileSize }
});
router.use(auth_1.authenticateToken);
router.post('/', upload.single('file'), (0, errorHandler_1.logActivity)('UPLOAD_FILE', 'FILE'), uploadController_1.uploadFile);
router.post('/image', upload.single('image'), (0, errorHandler_1.logActivity)('UPLOAD_IMAGE', 'FILE'), uploadController_1.uploadImage);
router.get('/files', uploadController_1.getFiles);
exports.default = router;
module.exports = router;
//# sourceMappingURL=uploadRoutes.js.map