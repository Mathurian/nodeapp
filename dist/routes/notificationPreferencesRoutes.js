"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationPreferencesController_1 = require("../controllers/notificationPreferencesController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get('/', notificationPreferencesController_1.getPreferences);
router.put('/', notificationPreferencesController_1.updatePreferences);
router.post('/reset', notificationPreferencesController_1.resetPreferences);
exports.default = router;
//# sourceMappingURL=notificationPreferencesRoutes.js.map