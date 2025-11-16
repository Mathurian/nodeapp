import { Router } from 'express';
import { emailTemplateController } from '../controllers/EmailTemplateController';
import { authenticateToken, checkRoles } from '../middleware/auth';

const router = Router();

// All email template routes require authentication
router.use(authenticateToken);

// Email Template Routes (Admin/Organizer can manage, others can view)
router.get('/email-templates', emailTemplateController.getAllTemplates.bind(emailTemplateController));
router.get('/email-templates/type/:type', emailTemplateController.getTemplatesByType.bind(emailTemplateController));
router.get('/email-templates/variables/:type', emailTemplateController.getAvailableVariables.bind(emailTemplateController));
router.get('/email-templates/:id', emailTemplateController.getTemplateById.bind(emailTemplateController));

// Management routes (Admin/Organizer only)
router.post('/email-templates', checkRoles(['ADMIN', 'ORGANIZER']), emailTemplateController.createTemplate.bind(emailTemplateController));
router.put('/email-templates/:id', checkRoles(['ADMIN', 'ORGANIZER']), emailTemplateController.updateTemplate.bind(emailTemplateController));
router.delete('/email-templates/:id', checkRoles(['ADMIN', 'ORGANIZER']), emailTemplateController.deleteTemplate.bind(emailTemplateController));
router.post('/email-templates/:id/clone', checkRoles(['ADMIN', 'ORGANIZER']), emailTemplateController.cloneTemplate.bind(emailTemplateController));
router.post('/email-templates/:id/preview', emailTemplateController.previewTemplate.bind(emailTemplateController));

export default router;
