import { Request, Response, NextFunction } from 'express';
export declare class NotificationsController {
    private notificationService;
    constructor();
    getAllNotifications: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getNotificationById: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    createNotification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    updateNotification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    deleteNotification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    markAsRead: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    markAllAsRead: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const getAllNotifications: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getNotificationById: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const createNotification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const updateNotification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const deleteNotification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const markAsRead: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const markAllAsRead: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=notificationsController.d.ts.map