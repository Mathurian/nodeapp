import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { NotificationService } from '../services/NotificationService';
import { sendSuccess } from '../utils/responseHelpers';

export class NotificationsController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = container.resolve(NotificationService);
  }

  getAllNotifications = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const notifications = await this.notificationService.getUserNotifications(req.user!.id);
      return sendSuccess(res, notifications);
    } catch (error) {
      return next(error);
    }
  };

  getNotificationById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      // NotificationService doesn't have getById, we can use the repository directly or return error
      // For now, return a not implemented error
      return res.status(501).json({ error: 'Not implemented' });
    } catch (error) {
      return next(error);
    }
  };

  createNotification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const notification = await this.notificationService.createNotification({
        ...req.body,
        userId: req.user!.id
      });
      return sendSuccess(res, notification, 'Notification created successfully', 201);
    } catch (error) {
      return next(error);
    }
  };

  updateNotification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      // NotificationService doesn't have update method
      return res.status(501).json({ error: 'Not implemented' });
    } catch (error) {
      return next(error);
    }
  };

  deleteNotification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      await this.notificationService.deleteNotification(id, req.user!.id);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      await this.notificationService.markAsRead(id, req.user!.id);
      return sendSuccess(res, null, 'Notification marked as read');
    } catch (error) {
      return next(error);
    }
  };

  markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const count = await this.notificationService.markAllAsRead(req.user!.id);
      return sendSuccess(res, { count }, 'All notifications marked as read');
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new NotificationsController();
export const getAllNotifications = controller.getAllNotifications;
export const getNotificationById = controller.getNotificationById;
export const createNotification = controller.createNotification;
export const updateNotification = controller.updateNotification;
export const deleteNotification = controller.deleteNotification;
export const markAsRead = controller.markAsRead;
export const markAllAsRead = controller.markAllAsRead;
