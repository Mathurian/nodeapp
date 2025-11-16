import { BaseEntity } from '../models/base.types';
export interface CreateEventDto {
    name: string;
    description?: string;
    startDate: Date | string;
    endDate: Date | string;
    location?: string;
    maxContestants?: number;
    contestantNumberingMode?: ContestantNumberingMode;
}
export interface UpdateEventDto {
    name?: string;
    description?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    location?: string;
    maxContestants?: number;
    contestantNumberingMode?: ContestantNumberingMode;
    archived?: boolean;
}
export interface EventResponseDto extends BaseEntity {
    name: string;
    description: string | null;
    startDate: Date;
    endDate: Date;
    location: string | null;
    maxContestants: number | null;
    contestantNumberingMode: ContestantNumberingMode;
    archived: boolean;
}
export type ContestantNumberingMode = 'MANUAL' | 'AUTO_INDEXED' | 'OPTIONAL';
//# sourceMappingURL=event.dto.d.ts.map