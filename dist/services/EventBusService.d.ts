export declare enum AppEventType {
    USER_CREATED = "user.created",
    USER_UPDATED = "user.updated",
    USER_DELETED = "user.deleted",
    USER_LOGGED_IN = "user.logged_in",
    USER_LOGGED_OUT = "user.logged_out",
    EVENT_CREATED = "event.created",
    EVENT_UPDATED = "event.updated",
    EVENT_DELETED = "event.deleted",
    EVENT_PUBLISHED = "event.published",
    CONTEST_CREATED = "contest.created",
    CONTEST_UPDATED = "contest.updated",
    CONTEST_DELETED = "contest.deleted",
    CONTEST_CERTIFIED = "contest.certified",
    CATEGORY_CREATED = "category.created",
    CATEGORY_UPDATED = "category.updated",
    CATEGORY_DELETED = "category.deleted",
    CATEGORY_CERTIFIED = "category.certified",
    SCORE_SUBMITTED = "score.submitted",
    SCORE_UPDATED = "score.updated",
    SCORE_DELETED = "score.deleted",
    SCORES_FINALIZED = "scores.finalized",
    ASSIGNMENT_CREATED = "assignment.created",
    ASSIGNMENT_UPDATED = "assignment.updated",
    ASSIGNMENT_DELETED = "assignment.deleted",
    CERTIFICATION_REQUESTED = "certification.requested",
    CERTIFICATION_APPROVED = "certification.approved",
    CERTIFICATION_REJECTED = "certification.rejected",
    NOTIFICATION_SENT = "notification.sent",
    EMAIL_SENT = "email.sent",
    SMS_SENT = "sms.sent",
    CACHE_INVALIDATED = "cache.invalidated",
    BACKUP_COMPLETED = "backup.completed",
    MAINTENANCE_STARTED = "maintenance.started",
    MAINTENANCE_COMPLETED = "maintenance.completed"
}
export interface AppEvent<T = any> {
    type: AppEventType;
    payload: T;
    metadata: {
        userId?: string;
        tenantId?: string;
        timestamp: Date;
        source: string;
        correlationId?: string;
    };
}
export type EventHandler<T = any> = (event: AppEvent<T>) => Promise<void>;
export declare class EventBusService {
    private static instance;
    private queueService;
    private handlers;
    private readonly EVENTS_QUEUE;
    private constructor();
    static getInstance(): EventBusService;
    private initializeWorker;
    publish<T = any>(type: AppEventType, payload: T, metadata?: Partial<AppEvent['metadata']>): Promise<void>;
    subscribe<T = any>(type: AppEventType, handler: EventHandler<T>): () => void;
    unsubscribe<T = any>(type: AppEventType, handler: EventHandler<T>): void;
    private processEvent;
    private getEventPriority;
    private generateCorrelationId;
    getEventStats(): Promise<{
        queue: string;
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        total: number;
    }>;
    shutdown(): Promise<void>;
}
declare const _default: EventBusService;
export default _default;
//# sourceMappingURL=EventBusService.d.ts.map