"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const NotificationService_1 = require("../services/NotificationService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const notificationService = tsyringe_1.container.resolve(NotificationService_1.NotificationService);
        const userId = req.user.id;
        const tenantId = req.user.tenantId;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const notifications = await notificationService.getUserNotifications(userId, tenantId, limit, offset);
        res.json(notifications);
    }
    catch (error) {
        return next(error);
    }
});
router.get('/unread-count', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const notificationService = tsyringe_1.container.resolve(NotificationService_1.NotificationService);
        const userId = req.user.id;
        const tenantId = req.user.tenantId;
        const count = await notificationService.getUnreadCount(userId, tenantId);
        res.json({ count });
    }
    catch (error) {
        return next(error);
    }
});
router.put('/:id/read', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const notificationService = tsyringe_1.container.resolve(NotificationService_1.NotificationService);
        const { id } = req.params;
        const userId = req.user.id;
        const tenantId = req.user.tenantId;
        const notification = await notificationService.markAsRead(id, userId, tenantId);
        res.json(notification);
    }
    catch (error) {
        return next(error);
    }
});
router.put('/read-all', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const notificationService = tsyringe_1.container.resolve(NotificationService_1.NotificationService);
        const userId = req.user.id;
        const tenantId = req.user.tenantId;
        const count = await notificationService.markAllAsRead(userId, tenantId);
        res.json({ count });
    }
    catch (error) {
        return next(error);
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const notificationService = tsyringe_1.container.resolve(NotificationService_1.NotificationService);
        const { id } = req.params;
        const userId = req.user.id;
        const tenantId = req.user.tenantId;
        await notificationService.deleteNotification(id, userId, tenantId);
        res.json({ success: true });
    }
    catch (error) {
        return next(error);
    }
});
router.delete('/read-all', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const notificationService = tsyringe_1.container.resolve(NotificationService_1.NotificationService);
        const userId = req.user.id;
        const tenantId = req.user.tenantId;
        const daysOld = parseInt(req.query.daysOld) || 30;
        const count = await notificationService.cleanupOldNotifications(userId, tenantId, daysOld);
        res.json({ count });
    }
    catch (error) {
        return next(error);
    }
});
exports.default = router;
//# sourceMappingURL=notificationsRoutes.js.map