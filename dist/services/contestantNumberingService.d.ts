declare class ContestantNumberingService {
    getNextContestantNumber(contestId: string): Promise<number | null>;
    getNumberingMode(contestId: string): Promise<string>;
    validateContestantNumber(contestId: string, contestantNumber: number | null): Promise<{
        valid: boolean;
        error?: string;
    }>;
    resetContestantNumbering(contestId: string, startNumber?: number): Promise<{
        success: boolean;
    }>;
}
declare const _default: ContestantNumberingService;
export default _default;
//# sourceMappingURL=contestantNumberingService.d.ts.map