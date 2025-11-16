import { Router } from 'express';
import { customFieldController } from '../controllers/CustomFieldController';
import { authenticateToken, checkRoles } from '../middleware/auth';

const router = Router();

// All custom field routes require authentication
router.use(authenticateToken);

// Custom Field Management Routes (Admin/Organizer only)
router.get('/custom-fields/:entityType', customFieldController.getCustomFields.bind(customFieldController));
router.get('/custom-fields/field/:id', customFieldController.getCustomFieldById.bind(customFieldController));
router.post('/custom-fields', checkRoles(['ADMIN', 'ORGANIZER']), customFieldController.createCustomField.bind(customFieldController));
router.put('/custom-fields/:id', checkRoles(['ADMIN', 'ORGANIZER']), customFieldController.updateCustomField.bind(customFieldController));
router.delete('/custom-fields/:id', checkRoles(['ADMIN', 'ORGANIZER']), customFieldController.deleteCustomField.bind(customFieldController));
router.post('/custom-fields/reorder', checkRoles(['ADMIN', 'ORGANIZER']), customFieldController.reorderCustomFields.bind(customFieldController));

// Custom Field Value Routes (All authenticated users can read/set their own values)
router.get('/custom-fields/values/:entityId', customFieldController.getCustomFieldValues.bind(customFieldController));
router.post('/custom-fields/values', customFieldController.setCustomFieldValue.bind(customFieldController));
router.post('/custom-fields/values/bulk', customFieldController.bulkSetCustomFieldValues.bind(customFieldController));
router.delete('/custom-fields/values/:customFieldId/:entityId', customFieldController.deleteCustomFieldValue.bind(customFieldController));

export default router;
