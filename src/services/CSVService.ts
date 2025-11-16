import { injectable } from 'tsyringe';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { createLogger } from '../utils/logger';

const Logger = createLogger('CSVService');

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
  parseCSV(fileBuffer: Buffer, columns?: string[]): any[] {
    try {
      const records = parse(fileBuffer, {
        columns: columns || true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relaxColumnCount: true
      });

      Logger.info('CSV parsed successfully', { recordCount: records.length });
      return records;
    } catch (error) {
      Logger.error('CSV parse failed', { error });
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate and import users from CSV
   * @param csvData Parsed CSV data
   */
  async validateUsersImport(csvData: any[]): Promise<CSVImportResult> {
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
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        result.errors.push({
          row: rowNumber,
          field: 'email',
          error: 'Invalid email format',
          value: row.email
        });
        hasError = true;
      }

      // Validate role
      if (row.role && !validRoles.includes(row.role.toUpperCase())) {
        result.errors.push({
          row: rowNumber,
          field: 'role',
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
          value: row.role
        });
        hasError = true;
      }

      if (hasError) {
        result.failed++;
      } else {
        result.successful++;
        result.data.push({
          email: row.email.toLowerCase().trim(),
          name: row.name.trim(),
          role: row.role.toUpperCase(),
          phone: row.phone?.trim() || null,
          active: row.active === 'false' || row.active === '0' ? false : true
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
  async validateContestantsImport(csvData: any[]): Promise<CSVImportResult> {
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
      if (row.number && isNaN(parseInt(row.number))) {
        result.errors.push({
          row: rowNumber,
          field: 'number',
          error: 'Number must be a valid integer',
          value: row.number
        });
        hasError = true;
      }

      if (hasError) {
        result.failed++;
      } else {
        result.successful++;
        result.data.push({
          name: row.name.trim(),
          number: row.number ? parseInt(row.number) : null,
          contestId: row.contestId.trim(),
          bio: row.bio?.trim() || null
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
  async validateJudgesImport(csvData: any[]): Promise<CSVImportResult> {
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
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        result.errors.push({
          row: rowNumber,
          field: 'email',
          error: 'Invalid email format',
          value: row.email
        });
        hasError = true;
      }

      if (hasError) {
        result.failed++;
      } else {
        result.successful++;
        result.data.push({
          name: row.name.trim(),
          email: row.email.toLowerCase().trim(),
          phone: row.phone?.trim() || null,
          bio: row.bio?.trim() || null,
          certified: row.certified === 'true' || row.certified === '1'
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
    data: any[],
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
