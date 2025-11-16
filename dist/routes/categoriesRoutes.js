"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const categoriesController_1 = require("../controllers/categoriesController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', categoriesController_1.getAllCategories);
router.get('/contest/:contestId', categoriesController_1.getCategoriesByContest);
router.post('/contest/:contestId', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, validation_1.validate)(validation_1.createCategorySchema), (0, errorHandler_1.logActivity)('CREATE_CATEGORY', 'CATEGORY'), categoriesController_1.createCategory);
router.post('/', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, validation_1.validate)(validation_1.createCategorySchema), (0, errorHandler_1.logActivity)('CREATE_CATEGORY', 'CATEGORY'), categoriesController_1.createCategory);
router.get('/:id', categoriesController_1.getCategoryById);
router.put('/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, validation_1.validate)(validation_1.updateCategorySchema), (0, errorHandler_1.logActivity)('UPDATE_CATEGORY', 'CATEGORY'), categoriesController_1.updateCategory);
router.put('/:id/time-limit', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('UPDATE_CATEGORY_TIME_LIMIT', 'CATEGORY'), categoriesController_1.updateCategoryWithTimeLimit);
router.delete('/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('DELETE_CATEGORY', 'CATEGORY'), categoriesController_1.deleteCategory);
router.get('/:categoryId/criteria', categoriesController_1.getCategoryCriteria);
router.post('/:categoryId/criteria/bulk-delete', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('BULK_DELETE_CRITERIA', 'CRITERION'), categoriesController_1.bulkDeleteCriteria);
router.post('/:categoryId/criteria/bulk-update', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('BULK_UPDATE_CRITERIA', 'CRITERION'), categoriesController_1.bulkUpdateCriteria);
router.post('/:categoryId/criteria', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('CREATE_CRITERION', 'CRITERION'), categoriesController_1.createCriterion);
router.put('/criteria/:criterionId', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('UPDATE_CRITERION', 'CRITERION'), categoriesController_1.updateCriterion);
router.delete('/criteria/:criterionId', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('DELETE_CRITERION', 'CRITERION'), categoriesController_1.deleteCriterion);
exports.default = router;
module.exports = router;
//# sourceMappingURL=categoriesRoutes.js.map