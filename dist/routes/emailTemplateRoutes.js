"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const EmailTemplateController_1 = require("../controllers/EmailTemplateController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get('/email-templates', EmailTemplateController_1.emailTemplateController.getAllTemplates.bind(EmailTemplateController_1.emailTemplateController));
router.get('/email-templates/type/:type', EmailTemplateController_1.emailTemplateController.getTemplatesByType.bind(EmailTemplateController_1.emailTemplateController));
router.get('/email-templates/variables/:type', EmailTemplateController_1.emailTemplateController.getAvailableVariables.bind(EmailTemplateController_1.emailTemplateController));
router.get('/email-templates/:id', EmailTemplateController_1.emailTemplateController.getTemplateById.bind(EmailTemplateController_1.emailTemplateController));
router.post('/email-templates', (0, auth_1.checkRoles)(['ADMIN', 'ORGANIZER']), EmailTemplateController_1.emailTemplateController.createTemplate.bind(EmailTemplateController_1.emailTemplateController));
router.put('/email-templates/:id', (0, auth_1.checkRoles)(['ADMIN', 'ORGANIZER']), EmailTemplateController_1.emailTemplateController.updateTemplate.bind(EmailTemplateController_1.emailTemplateController));
router.delete('/email-templates/:id', (0, auth_1.checkRoles)(['ADMIN', 'ORGANIZER']), EmailTemplateController_1.emailTemplateController.deleteTemplate.bind(EmailTemplateController_1.emailTemplateController));
router.post('/email-templates/:id/clone', (0, auth_1.checkRoles)(['ADMIN', 'ORGANIZER']), EmailTemplateController_1.emailTemplateController.cloneTemplate.bind(EmailTemplateController_1.emailTemplateController));
router.post('/email-templates/:id/preview', EmailTemplateController_1.emailTemplateController.previewTemplate.bind(EmailTemplateController_1.emailTemplateController));
exports.default = router;
//# sourceMappingURL=emailTemplateRoutes.js.map