import { Request, Response, NextFunction } from 'express';
export declare class EventsController {
    private eventService;
    constructor();
    getAllEvents: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getEventById: (req: Request, res: Response, next: NextFunction) => Promise<any>;
    getEventWithDetails: (req: Request, res: Response, next: NextFunction) => Promise<any>;
    getUpcomingEvents: (_req: Request, res: Response, next: NextFunction) => Promise<any>;
    getOngoingEvents: (_req: Request, res: Response, next: NextFunction) => Promise<any>;
    getPastEvents: (_req: Request, res: Response, next: NextFunction) => Promise<any>;
    createEvent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateEvent: (req: Request, res: Response, next: NextFunction) => Promise<any>;
    deleteEvent: (req: Request, res: Response, next: NextFunction) => Promise<any>;
    archiveEvent: (req: Request, res: Response, next: NextFunction) => Promise<any>;
    unarchiveEvent: (req: Request, res: Response, next: NextFunction) => Promise<any>;
    getEventStats: (req: Request, res: Response, next: NextFunction) => Promise<any>;
    searchEvents: (req: Request, res: Response, next: NextFunction) => Promise<any>;
}
declare const controller: EventsController;
export declare const getAllEvents: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getEventById: (req: Request, res: Response, next: NextFunction) => Promise<any>;
export declare const getEventWithDetails: (req: Request, res: Response, next: NextFunction) => Promise<any>;
export declare const getUpcomingEvents: (_req: Request, res: Response, next: NextFunction) => Promise<any>;
export declare const getOngoingEvents: (_req: Request, res: Response, next: NextFunction) => Promise<any>;
export declare const getPastEvents: (_req: Request, res: Response, next: NextFunction) => Promise<any>;
export declare const createEvent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateEvent: (req: Request, res: Response, next: NextFunction) => Promise<any>;
export declare const deleteEvent: (req: Request, res: Response, next: NextFunction) => Promise<any>;
export declare const archiveEvent: (req: Request, res: Response, next: NextFunction) => Promise<any>;
export declare const unarchiveEvent: (req: Request, res: Response, next: NextFunction) => Promise<any>;
export declare const getEventStats: (req: Request, res: Response, next: NextFunction) => Promise<any>;
export declare const searchEvents: (req: Request, res: Response, next: NextFunction) => Promise<any>;
export default controller;
//# sourceMappingURL=eventsController.d.ts.map