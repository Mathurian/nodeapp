export interface CSVParseError {
    row: number;
    field: string;
    error: string;
    value?: any;
}
export interface CSVImportResult {
    total: number;
    successful: number;
    failed: number;
    errors: CSVParseError[];
    data: any[];
}
export declare class CSVService {
    constructor();
    parseCSV(fileBuffer: Buffer, columns?: string[]): any[];
    validateUsersImport(csvData: any[]): Promise<CSVImportResult>;
    validateContestantsImport(csvData: any[]): Promise<CSVImportResult>;
    validateJudgesImport(csvData: any[]): Promise<CSVImportResult>;
    exportToCSV(data: any[], columns: string[], headers?: string[]): string;
    generateTemplate(type: 'users' | 'contestants' | 'judges'): string;
}
//# sourceMappingURL=CSVService.d.ts.map