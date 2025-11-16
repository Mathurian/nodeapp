"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const eventsController_1 = require("../controllers/eventsController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', eventsController_1.getAllEvents);
router.get('/:id', eventsController_1.getEventById);
router.post('/', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, validation_1.validate)(validation_1.createEventSchema), (0, errorHandler_1.logActivity)('CREATE_EVENT', 'EVENT'), eventsController_1.createEvent);
router.put('/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, validation_1.validate)(validation_1.updateEventSchema), (0, errorHandler_1.logActivity)('UPDATE_EVENT', 'EVENT'), eventsController_1.updateEvent);
router.delete('/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('DELETE_EVENT', 'EVENT'), eventsController_1.deleteEvent);
exports.default = router;
module.exports = router;
//# sourceMappingURL=eventsRoutes.js.map