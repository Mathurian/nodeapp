"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CustomFieldController_1 = require("../controllers/CustomFieldController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get('/custom-fields/:entityType', CustomFieldController_1.customFieldController.getCustomFields.bind(CustomFieldController_1.customFieldController));
router.get('/custom-fields/field/:id', CustomFieldController_1.customFieldController.getCustomFieldById.bind(CustomFieldController_1.customFieldController));
router.post('/custom-fields', (0, auth_1.checkRoles)(['ADMIN', 'ORGANIZER']), CustomFieldController_1.customFieldController.createCustomField.bind(CustomFieldController_1.customFieldController));
router.put('/custom-fields/:id', (0, auth_1.checkRoles)(['ADMIN', 'ORGANIZER']), CustomFieldController_1.customFieldController.updateCustomField.bind(CustomFieldController_1.customFieldController));
router.delete('/custom-fields/:id', (0, auth_1.checkRoles)(['ADMIN', 'ORGANIZER']), CustomFieldController_1.customFieldController.deleteCustomField.bind(CustomFieldController_1.customFieldController));
router.post('/custom-fields/reorder', (0, auth_1.checkRoles)(['ADMIN', 'ORGANIZER']), CustomFieldController_1.customFieldController.reorderCustomFields.bind(CustomFieldController_1.customFieldController));
router.get('/custom-fields/values/:entityId', CustomFieldController_1.customFieldController.getCustomFieldValues.bind(CustomFieldController_1.customFieldController));
router.post('/custom-fields/values', CustomFieldController_1.customFieldController.setCustomFieldValue.bind(CustomFieldController_1.customFieldController));
router.post('/custom-fields/values/bulk', CustomFieldController_1.customFieldController.bulkSetCustomFieldValues.bind(CustomFieldController_1.customFieldController));
router.delete('/custom-fields/values/:customFieldId/:entityId', CustomFieldController_1.customFieldController.deleteCustomFieldValue.bind(CustomFieldController_1.customFieldController));
exports.default = router;
//# sourceMappingURL=customFieldRoutes.js.map