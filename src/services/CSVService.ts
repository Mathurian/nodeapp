import { injectable } from 'tsyringe';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { createLogger } from '../utils/logger';

const Logger = createLogger('CSVService');

export interface CSVParseError {
  row: number;
  field: string;
  error: string;
  value?: unknown;
}

export type CSVRow = Record<string, string | number | boolean | null | undefined>;

export interface CSVImportResult<T = CSVRow> {
  total: number;
  successful: number;
  failed: number;
  errors: CSVParseError[];
  data: T[];
}

@injectable()
export class CSVService {
  constructor() {
    // Logger is already defined at module level
  }

  /**
   * Parse CSV file buffer to objects
   * @param fileBuffer CSV file buffer
   * @param columns Optional column definitions
   */
  parseCSV(fileBuffer: Buffer, columns?: string[]): CSVRow[] {
    try {
      const records = parse(fileBuffer, {
        columns: columns || true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relaxColumnCount: true
      });

      Logger.info('CSV parsed successfully', { recordCount: records.length });
      return records as CSVRow[];
    } catch (error) {
      Logger.error('CSV parse failed', { error });
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate and import users from CSV
   * @param csvData Parsed CSV data
   */
  async validateUsersImport(csvData: CSVRow[]): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      total: csvData.length,
      successful: 0,
      failed: 0,
      errors: [],
      data: []
    };

    const requiredFields = ['email', 'name', 'role'];
    const validRoles = ['ADMIN', 'BOARD', 'TALLYMASTER', 'AUDITOR', 'JUDGE', 'EMCEE', 'CONTESTANT'];

    csvData.forEach((row, index) => {
      const rowNumber = index + 2; // +2 for header row and 0-index
      let hasError = false;

      // Check required fields
      for (const field of requiredFields) {
        if (!row[field] || row[field].toString().trim() === '') {
          result.errors.push({
            row: rowNumber,
            field,
            error: 'Required field is missing or empty',
            value: row[field]
          });
          hasError = true;
        }
      }

      // Validate email format
      const email = String(row['email'] || '');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        result.errors.push({
          row: rowNumber,
          field: 'email',
          error: 'Invalid email format',
          value: email
        });
        hasError = true;
      }

      // Validate role
      const role = String(row['role'] || '');
      if (role && !validRoles.includes(role.toUpperCase())) {
        result.errors.push({
          row: rowNumber,
          field: 'role',
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
          value: role
        });
        hasError = true;
      }

      if (hasError) {
        result.failed++;
      } else {
        result.successful++;
        const rowEmail = String(row['email'] || '');
        const rowName = String(row['name'] || '');
        const rowRole = String(row['role'] || '');
        const rowPhone = row['phone'] ? String(row['phone']) : null;
        const rowActive = row['active'];
        result.data.push({
          email: rowEmail.toLowerCase().trim(),
          name: rowName.trim(),
          role: rowRole.toUpperCase(),
          phone: rowPhone?.trim() || null,
          active: rowActive === 'false' || rowActive === '0' || rowActive === false ? false : true
        });
      }
    });

    Logger.info('User import validation completed', {
      total: result.total,
      successful: result.successful,
      failed: result.failed
    });

    return result;
  }

  /**
   * Validate and import contestants from CSV
   * @param csvData Parsed CSV data
   */
  async validateContestantsImport(csvData: CSVRow[]): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      total: csvData.length,
      successful: 0,
      failed: 0,
      errors: [],
      data: []
    };

    const requiredFields = ['name', 'contestId'];

    csvData.forEach((row, index) => {
      const rowNumber = index + 2;
      let hasError = false;

      // Check required fields
      for (const field of requiredFields) {
        if (!row[field] || row[field].toString().trim() === '') {
          result.errors.push({
            row: rowNumber,
            field,
            error: 'Required field is missing or empty',
            value: row[field]
          });
          hasError = true;
        }
      }

      // Validate number (if provided)
      const rowNumberValue = row['number'];
      if (rowNumberValue && isNaN(parseInt(String(rowNumberValue)))) {
        result.errors.push({
          row: rowNumber,
          field: 'number',
          error: 'Number must be a valid integer',
          value: String(rowNumberValue)
        });
        hasError = true;
      }

      if (hasError) {
        result.failed++;
      } else {
        const rowName = String(row['name'] || '');
        const rowContestId = String(row['contestId'] || '');
        const rowBio = row['bio'] ? String(row['bio']) : null;
        result.successful++;
        result.data.push({
          name: rowName.trim(),
          number: rowNumberValue ? parseInt(String(rowNumberValue)) : null,
          contestId: rowContestId.trim(),
          bio: rowBio?.trim() || null
        });
      }
    });

    Logger.info('Contestant import validation completed', {
      total: result.total,
      successful: result.successful,
      failed: result.failed
    });

    return result;
  }

  /**
   * Validate and import judges from CSV
   * @param csvData Parsed CSV data
   */
  async validateJudgesImport(csvData: CSVRow[]): Promise<CSVImportResult> {
    const result: CSVImportResult = {
      total: csvData.length,
      successful: 0,
      failed: 0,
      errors: [],
      data: []
    };

    const requiredFields = ['name', 'email'];

    csvData.forEach((row, index) => {
      const rowNumber = index + 2;
      let hasError = false;

      // Check required fields
      for (const field of requiredFields) {
        if (!row[field] || row[field].toString().trim() === '') {
          result.errors.push({
            row: rowNumber,
            field,
            error: 'Required field is missing or empty',
            value: row[field]
          });
          hasError = true;
        }
      }

      // Validate email format
      const judgeEmail = String(row['email'] || '');
      if (judgeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(judgeEmail)) {
        result.errors.push({
          row: rowNumber,
          field: 'email',
          error: 'Invalid email format',
          value: judgeEmail
        });
        hasError = true;
      }

      if (hasError) {
        result.failed++;
      } else {
        result.successful++;
        const judgeName = String(row['name'] || '');
        const judgeEmailValue = String(row['email'] || '');
        const judgePhone = row['phone'] ? String(row['phone']) : null;
        const judgeBio = row['bio'] ? String(row['bio']) : null;
        const judgeCertified = row['certified'];
        result.data.push({
          name: judgeName.trim(),
          email: judgeEmailValue.toLowerCase().trim(),
          phone: judgePhone?.trim() || null,
          bio: judgeBio?.trim() || null,
          certified: judgeCertified === 'true' || judgeCertified === '1' || judgeCertified === true
        });
      }
    });

    Logger.info('Judge import validation completed', {
      total: result.total,
      successful: result.successful,
      failed: result.failed
    });

    return result;
  }

  /**
   * Export data to CSV format
   * @param data Array of objects to export
   * @param columns Column definitions (field names)
   * @param headers Optional header labels (defaults to field names)
   */
  exportToCSV(
    data: CSVRow[],
    columns: string[],
    headers?: string[]
  ): string {
    try {
      const csvData = stringify(data, {
        header: true,
        columns: columns.map((col, index) => ({
          key: col,
          header: headers?.[index] || col
        }))
      });

      Logger.info('CSV export completed', { recordCount: data.length });
      return csvData;
    } catch (error) {
      Logger.error('CSV export failed', { error });
      throw new Error(`Failed to export CSV: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate CSV template for import
   * @param type Import type (users, contestants, judges)
   */
  generateTemplate(type: 'users' | 'contestants' | 'judges'): string {
    const templates = {
      users: {
        columns: ['email', 'name', 'role', 'phone', 'active'],
        sample: [
          {
            email: 'example@example.com',
            name: 'John Doe',
            role: 'JUDGE',
            phone: '555-1234',
            active: 'true'
          }
        ]
      },
      contestants: {
        columns: ['name', 'number', 'contestId', 'bio'],
        sample: [
          {
            name: 'Jane Smith',
            number: '1',
            contestId: 'contest-id-here',
            bio: 'Optional biography'
          }
        ]
      },
      judges: {
        columns: ['name', 'email', 'phone', 'bio', 'certified'],
        sample: [
          {
            name: 'Judge Name',
            email: 'judge@example.com',
            phone: '555-5678',
            bio: 'Optional biography',
            certified: 'false'
          }
        ]
      }
    };

    const template = templates[type];
    return this.exportToCSV(template.sample, template.columns);
  }
}
