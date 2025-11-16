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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const customFieldsController = __importStar(require("../controllers/customFieldsController"));
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.post('/', (0, auth_1.requireRole)([client_1.UserRole.ADMIN]), customFieldsController.createCustomField);
router.get('/:entityType', customFieldsController.getCustomFieldsByEntityType);
router.get('/field/:id', customFieldsController.getCustomFieldById);
router.put('/:id', (0, auth_1.requireRole)([client_1.UserRole.ADMIN]), customFieldsController.updateCustomField);
router.delete('/:id', (0, auth_1.requireRole)([client_1.UserRole.ADMIN]), customFieldsController.deleteCustomField);
router.post('/values', customFieldsController.setCustomFieldValue);
router.post('/values/bulk', customFieldsController.bulkSetCustomFieldValues);
router.get('/values/:entityId', customFieldsController.getCustomFieldValues);
router.delete('/values/:customFieldId/:entityId', customFieldsController.deleteCustomFieldValue);
router.post('/reorder', (0, auth_1.requireRole)([client_1.UserRole.ADMIN]), customFieldsController.reorderCustomFields);
exports.default = router;
//# sourceMappingURL=customFieldsRoutes.js.map