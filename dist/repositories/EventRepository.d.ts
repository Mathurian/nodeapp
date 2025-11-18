import { Event } from '@prisma/client';
import { BaseRepository } from './BaseRepository';
export type EventWithRelations = any;
export declare class EventRepository extends BaseRepository<Event> {
    protected getModelName(): string;
    findActiveEvents(): Promise<Event[]>;
    findArchivedEvents(): Promise<Event[]>;
    findUpcomingEvents(): Promise<Event[]>;
    findOngoingEvents(): Promise<Event[]>;
    findPastEvents(): Promise<Event[]>;
    findEventWithDetails(eventId: string): Promise<EventWithRelations | null>;
    findEventsByDateRange(startDate: Date, endDate: Date): Promise<Event[]>;
    searchEvents(query: string): Promise<Event[]>;
    archiveEvent(eventId: string): Promise<Event>;
    unarchiveEvent(eventId: string): Promise<Event>;
    getEventStats(eventId: string): Promise<{
        totalContests: number;
        totalCategories: number;
        totalContestants: number;
        totalJudges: number;
        totalScores: number;
    }>;
    getEventsRequiringAttention(): Promise<Event[]>;
}
//# sourceMappingURL=EventRepository.d.ts.map