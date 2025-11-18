import { Event } from '@prisma/client';
import { BaseService } from './BaseService';
import { EventRepository } from '../repositories/EventRepository';
import { CacheService } from './CacheService';
import { RestrictionService } from './RestrictionService';
interface CreateEventDto {
    name: string;
    startDate: Date | string;
    endDate: Date | string;
    location?: string;
    description?: string;
    maxContestants?: number;
    contestantNumberingMode?: 'MANUAL' | 'AUTO';
}
interface UpdateEventDto extends Partial<CreateEventDto> {
}
interface EventFilters {
    archived?: boolean;
    startDate?: Date;
    endDate?: Date;
    search?: string;
}
export declare class EventService extends BaseService {
    private eventRepo;
    private cacheService;
    private restrictionService;
    constructor(eventRepo: EventRepository, cacheService: CacheService, restrictionService: RestrictionService);
    private getCacheKey;
    private getListCacheKey;
    private invalidateEventCache;
    createEvent(data: CreateEventDto): Promise<Event>;
    getEventById(id: string): Promise<Event>;
    getEventWithDetails(id: string): Promise<any>;
    getAllEvents(filters?: EventFilters): Promise<Event[]>;
    getUpcomingEvents(): Promise<Event[]>;
    getOngoingEvents(): Promise<Event[]>;
    getPastEvents(): Promise<Event[]>;
    updateEvent(id: string, data: UpdateEventDto): Promise<Event>;
    archiveEvent(id: string): Promise<Event>;
    unarchiveEvent(id: string): Promise<Event>;
    deleteEvent(id: string): Promise<void>;
    getEventStats(id: string): Promise<any>;
    searchEvents(query: string): Promise<Event[]>;
    getEventsByDateRange(startDate: Date, endDate: Date): Promise<Event[]>;
    getEventsRequiringAttention(): Promise<Event[]>;
}
export {};
//# sourceMappingURL=EventService.d.ts.map