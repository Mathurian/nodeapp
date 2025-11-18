"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsRead = exports.markAsRead = exports.deleteNotification = exports.updateNotification = exports.createNotification = exports.getNotificationById = exports.getAllNotifications = exports.NotificationsController = void 0;
const container_1 = require("../config/container");
const NotificationService_1 = require("../services/NotificationService");
const responseHelpers_1 = require("../utils/responseHelpers");
class NotificationsController {
    notificationService;
    constructor() {
        this.notificationService = container_1.container.resolve(NotificationService_1.NotificationService);
    }
    getAllNotifications = async (req, res, next) => {
        try {
            const notifications = await this.notificationService.getUserNotifications(req.user.id, req.user.tenantId);
            return (0, responseHelpers_1.sendSuccess)(res, notifications);
        }
        catch (error) {
            return next(error);
        }
    };
    getNotificationById = async (_req, res, next) => {
        try {
            return res.status(501).json({ error: 'Not implemented' });
        }
        catch (error) {
            return next(error);
        }
    };
    createNotification = async (req, res, next) => {
        try {
            const notification = await this.notificationService.createNotification({
                ...req.body,
                userId: req.user.id
            });
            return (0, responseHelpers_1.sendSuccess)(res, notification, 'Notification created successfully', 201);
        }
        catch (error) {
            return next(error);
        }
    };
    updateNotification = async (_req, res, next) => {
        try {
            return res.status(501).json({ error: 'Not implemented' });
        }
        catch (error) {
            return next(error);
        }
    };
    deleteNotification = async (req, res, next) => {
        try {
            const { id } = req.params;
            await this.notificationService.deleteNotification(id, req.user.id, req.user.tenantId);
            return res.status(204).send();
        }
        catch (error) {
            return next(error);
        }
    };
    markAsRead = async (req, res, next) => {
        try {
            const { id } = req.params;
            await this.notificationService.markAsRead(id, req.user.id, req.user.tenantId);
            return (0, responseHelpers_1.sendSuccess)(res, null, 'Notification marked as read');
        }
        catch (error) {
            return next(error);
        }
    };
    markAllAsRead = async (req, res, next) => {
        try {
            const count = await this.notificationService.markAllAsRead(req.user.id, req.user.tenantId);
            return (0, responseHelpers_1.sendSuccess)(res, { count }, 'All notifications marked as read');
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.NotificationsController = NotificationsController;
const controller = new NotificationsController();
exports.getAllNotifications = controller.getAllNotifications;
exports.getNotificationById = controller.getNotificationById;
exports.createNotification = controller.createNotification;
exports.updateNotification = controller.updateNotification;
exports.deleteNotification = controller.deleteNotification;
exports.markAsRead = controller.markAsRead;
exports.markAllAsRead = controller.markAllAsRead;
//# sourceMappingURL=notificationsController.js.map