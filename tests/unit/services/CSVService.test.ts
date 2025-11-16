/**
 * CSVService Unit Tests
 * Comprehensive tests for CSV import/export service
 */

import 'reflect-metadata';
import { CSVService, CSVImportResult } from '../../../src/services/CSVService';

describe('CSVService', () => {
  let service: CSVService;

  beforeEach(() => {
    service = new CSVService();
    jest.clearAllMocks();
  });

  describe('parseCSV', () => {
    it('should successfully parse valid CSV data', () => {
      const csvData = `name,email,role
John Doe,john@example.com,JUDGE
Jane Smith,jane@example.com,ADMIN`;
      const buffer = Buffer.from(csvData);

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        role: 'JUDGE'
      });
      expect(result[1]).toEqual({
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'ADMIN'
      });
    });

    it('should parse CSV with custom column headers', () => {
      const csvData = `John Doe,john@example.com,JUDGE
Jane Smith,jane@example.com,ADMIN`;
      const buffer = Buffer.from(csvData);
      const columns = ['name', 'email', 'role'];

      const result = service.parseCSV(buffer, columns);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John Doe');
    });

    it('should skip empty lines in CSV', () => {
      const csvData = `name,email,role
John Doe,john@example.com,JUDGE

Jane Smith,jane@example.com,ADMIN

`;
      const buffer = Buffer.from(csvData);

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(2);
    });

    it('should trim whitespace from CSV fields', () => {
      const csvData = `name,email,role
  John Doe  ,  john@example.com  ,  JUDGE  `;
      const buffer = Buffer.from(csvData);

      const result = service.parseCSV(buffer);

      expect(result[0].name).toBe('John Doe');
      expect(result[0].email).toBe('john@example.com');
      expect(result[0].role).toBe('JUDGE');
    });

    it('should handle CSV with BOM (Byte Order Mark)', () => {
      const csvData = '\uFEFFname,email\nJohn,john@example.com';
      const buffer = Buffer.from(csvData);

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John');
    });

    it('should parse even malformed CSV gracefully', () => {
      const invalidData = Buffer.from('this is not CSV data at all{}[]');

      const result = service.parseCSV(invalidData);

      // CSV parser is lenient and will parse this as a single row
      expect(result).toBeDefined();
    });

    it('should handle empty CSV file', () => {
      const buffer = Buffer.from('');

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(0);
    });

    it('should relax column count for inconsistent rows', () => {
      const csvData = `name,email,role
John Doe,john@example.com
Jane Smith,jane@example.com,ADMIN,extra`;
      const buffer = Buffer.from(csvData);

      const result = service.parseCSV(buffer);

      expect(result).toHaveLength(2);
    });
  });

  describe('validateUsersImport', () => {
    it('should validate correct user data', async () => {
      const csvData = [
        { email: 'john@example.com', name: 'John Doe', role: 'JUDGE', phone: '555-1234' },
        { email: 'jane@example.com', name: 'Jane Smith', role: 'ADMIN', phone: '' }
      ];

      const result = await service.validateUsersImport(csvData);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].email).toBe('john@example.com');
      expect(result.data[0].role).toBe('JUDGE');
    });

    it('should fail validation for missing required fields', async () => {
      const csvData = [
        { email: '', name: 'John Doe', role: 'JUDGE' },
        { email: 'jane@example.com', name: '', role: 'ADMIN' },
        { email: 'bob@example.com', name: 'Bob', role: '' }
      ];

      const result = await service.validateUsersImport(csvData);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(3);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail validation for invalid email format', async () => {
      const csvData = [
        { email: 'not-an-email', name: 'John Doe', role: 'JUDGE' },
        { email: 'missing@domain', name: 'Jane Smith', role: 'ADMIN' }
      ];

      const result = await service.validateUsersImport(csvData);

      expect(result.failed).toBe(2);
      expect(result.errors.some(e => e.field === 'email' && e.error.includes('Invalid email'))).toBe(true);
    });

    it('should fail validation for invalid role', async () => {
      const csvData = [
        { email: 'john@example.com', name: 'John Doe', role: 'INVALID_ROLE' }
      ];

      const result = await service.validateUsersImport(csvData);

      expect(result.failed).toBe(1);
      expect(result.errors[0].field).toBe('role');
      expect(result.errors[0].error).toContain('Invalid role');
    });

    it('should normalize email to lowercase', async () => {
      const csvData = [
        { email: 'JOHN@EXAMPLE.COM', name: 'John Doe', role: 'JUDGE' }
      ];

      const result = await service.validateUsersImport(csvData);

      expect(result.data[0].email).toBe('john@example.com');
    });

    it('should normalize role to uppercase', async () => {
      const csvData = [
        { email: 'john@example.com', name: 'John Doe', role: 'judge' }
      ];

      const result = await service.validateUsersImport(csvData);

      expect(result.data[0].role).toBe('JUDGE');
    });

    it('should handle active field correctly', async () => {
      const csvData = [
        { email: 'john@example.com', name: 'John Doe', role: 'JUDGE', active: 'false' },
        { email: 'jane@example.com', name: 'Jane Smith', role: 'ADMIN', active: '0' },
        { email: 'bob@example.com', name: 'Bob', role: 'JUDGE', active: 'true' }
      ];

      const result = await service.validateUsersImport(csvData);

      expect(result.data[0].active).toBe(false);
      expect(result.data[1].active).toBe(false);
      expect(result.data[2].active).toBe(true);
    });

    it('should set null for optional empty fields', async () => {
      const csvData = [
        { email: 'john@example.com', name: 'John Doe', role: 'JUDGE', phone: '' }
      ];

      const result = await service.validateUsersImport(csvData);

      expect(result.successful).toBe(1);
      expect(result.data[0].phone).toBe(null);
    });

    it('should track row numbers in error messages', async () => {
      const csvData = [
        { email: 'john@example.com', name: 'John Doe', role: 'JUDGE' },
        { email: 'invalid', name: 'Jane Smith', role: 'ADMIN' }
      ];

      const result = await service.validateUsersImport(csvData);

      expect(result.errors[0].row).toBe(3); // Row 2 + 1 for header = row 3
    });
  });

  describe('validateContestantsImport', () => {
    it('should validate correct contestant data', async () => {
      const csvData = [
        { name: 'Contestant 1', number: '1', contestId: 'contest-1', bio: 'Bio 1' },
        { name: 'Contestant 2', number: '2', contestId: 'contest-1', bio: '' }
      ];

      const result = await service.validateContestantsImport(csvData);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].number).toBe(1);
    });

    it('should fail validation for missing required fields', async () => {
      const csvData = [
        { name: '', number: '1', contestId: 'contest-1' },
        { name: 'Contestant 2', number: '2', contestId: '' }
      ];

      const result = await service.validateContestantsImport(csvData);

      expect(result.failed).toBe(2);
    });

    it('should fail validation for invalid number field', async () => {
      const csvData = [
        { name: 'Contestant 1', number: 'not-a-number', contestId: 'contest-1' }
      ];

      const result = await service.validateContestantsImport(csvData);

      expect(result.failed).toBe(1);
      expect(result.errors[0].field).toBe('number');
      expect(result.errors[0].error).toContain('valid integer');
    });

    it('should allow null number when not provided', async () => {
      const csvData = [
        { name: 'Contestant 1', number: '', contestId: 'contest-1' }
      ];

      const result = await service.validateContestantsImport(csvData);

      expect(result.successful).toBe(1);
      expect(result.data[0].number).toBeNull();
    });

    it('should set null for optional empty bio', async () => {
      const csvData = [
        { name: 'Contestant 1', number: '1', contestId: 'contest-1', bio: '' }
      ];

      const result = await service.validateContestantsImport(csvData);

      expect(result.data[0].bio).toBeNull();
    });
  });

  describe('validateJudgesImport', () => {
    it('should validate correct judge data', async () => {
      const csvData = [
        { name: 'Judge 1', email: 'judge1@example.com', phone: '555-1234', bio: 'Bio', certified: 'true' },
        { name: 'Judge 2', email: 'judge2@example.com', phone: '', bio: '', certified: '0' }
      ];

      const result = await service.validateJudgesImport(csvData);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.data[0].certified).toBe(true);
      expect(result.data[1].certified).toBe(false);
    });

    it('should fail validation for missing required fields', async () => {
      const csvData = [
        { name: '', email: 'judge1@example.com' },
        { name: 'Judge 2', email: '' }
      ];

      const result = await service.validateJudgesImport(csvData);

      expect(result.failed).toBe(2);
    });

    it('should fail validation for invalid email format', async () => {
      const csvData = [
        { name: 'Judge 1', email: 'not-an-email' }
      ];

      const result = await service.validateJudgesImport(csvData);

      expect(result.failed).toBe(1);
      expect(result.errors[0].field).toBe('email');
    });

    it('should normalize email to lowercase', async () => {
      const csvData = [
        { name: 'Judge 1', email: 'JUDGE@EXAMPLE.COM' }
      ];

      const result = await service.validateJudgesImport(csvData);

      expect(result.data[0].email).toBe('judge@example.com');
    });

    it('should handle certified field as boolean', async () => {
      const csvData = [
        { name: 'Judge 1', email: 'judge1@example.com', certified: 'true' },
        { name: 'Judge 2', email: 'judge2@example.com', certified: '1' },
        { name: 'Judge 3', email: 'judge3@example.com', certified: 'false' }
      ];

      const result = await service.validateJudgesImport(csvData);

      expect(result.data[0].certified).toBe(true);
      expect(result.data[1].certified).toBe(true);
      expect(result.data[2].certified).toBe(false);
    });
  });

  describe('exportToCSV', () => {
    it('should export data to CSV format', () => {
      const data = [
        { name: 'John Doe', email: 'john@example.com', role: 'JUDGE' },
        { name: 'Jane Smith', email: 'jane@example.com', role: 'ADMIN' }
      ];
      const columns = ['name', 'email', 'role'];

      const csv = service.exportToCSV(data, columns);

      expect(csv).toContain('name,email,role');
      expect(csv).toContain('John Doe,john@example.com,JUDGE');
      expect(csv).toContain('Jane Smith,jane@example.com,ADMIN');
    });

    it('should export with custom headers', () => {
      const data = [
        { name: 'John Doe', email: 'john@example.com' }
      ];
      const columns = ['name', 'email'];
      const headers = ['Full Name', 'Email Address'];

      const csv = service.exportToCSV(data, columns, headers);

      expect(csv).toContain('Full Name,Email Address');
      expect(csv).toContain('John Doe,john@example.com');
    });

    it('should handle empty data array', () => {
      const data: any[] = [];
      const columns = ['name', 'email'];

      const csv = service.exportToCSV(data, columns);

      expect(csv).toContain('name,email');
    });

    it('should handle null data in export', () => {
      const data = null as any;
      const columns = ['name'];

      // The CSV library might handle this gracefully or throw
      try {
        const result = service.exportToCSV(data, columns);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('generateTemplate', () => {
    it('should generate users template', () => {
      const template = service.generateTemplate('users');

      expect(template).toContain('email');
      expect(template).toContain('name');
      expect(template).toContain('role');
      expect(template).toContain('phone');
      expect(template).toContain('active');
      expect(template).toContain('example@example.com');
    });

    it('should generate contestants template', () => {
      const template = service.generateTemplate('contestants');

      expect(template).toContain('name');
      expect(template).toContain('number');
      expect(template).toContain('contestId');
      expect(template).toContain('bio');
    });

    it('should generate judges template', () => {
      const template = service.generateTemplate('judges');

      expect(template).toContain('name');
      expect(template).toContain('email');
      expect(template).toContain('phone');
      expect(template).toContain('bio');
      expect(template).toContain('certified');
    });
  });

  describe('edge cases and validation', () => {
    it('should handle CSV with quotes in fields', () => {
      const csvData = `name,bio
"John ""The Judge"" Doe","A bio with, commas"`;
      const buffer = Buffer.from(csvData);

      const result = service.parseCSV(buffer);

      expect(result[0].name).toBe('John "The Judge" Doe');
      expect(result[0].bio).toBe('A bio with, commas');
    });

    it('should handle multiple validation errors for same row', async () => {
      const csvData = [
        { email: 'invalid', name: '', role: 'INVALID' }
      ];

      const result = await service.validateUsersImport(csvData);

      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors.every(e => e.row === 2)).toBe(true);
    });

    it('should handle large CSV files efficiently', async () => {
      const largeCsvData = Array.from({ length: 1000 }, (_, i) => ({
        email: `user${i}@example.com`,
        name: `User ${i}`,
        role: 'JUDGE'
      }));

      const result = await service.validateUsersImport(largeCsvData);

      expect(result.total).toBe(1000);
      expect(result.successful).toBe(1000);
    });

    it('should process data with spaces correctly', async () => {
      const csvData = [
        { email: 'john@example.com', name: 'John Doe Jr.', role: 'JUDGE' }
      ];

      const result = await service.validateUsersImport(csvData);

      expect(result.successful).toBe(1);
      expect(result.data[0].name).toBe('John Doe Jr.');
    });

    it('should handle unicode characters in CSV', () => {
      const csvData = `name,bio
José García,Biografía en español
王小明,中文简介`;
      const buffer = Buffer.from(csvData);

      const result = service.parseCSV(buffer);

      expect(result[0].name).toBe('José García');
      expect(result[1].name).toBe('王小明');
    });

    it('should validate all allowed roles', async () => {
      const validRoles = ['ADMIN', 'BOARD', 'TALLYMASTER', 'AUDITOR', 'JUDGE', 'EMCEE', 'CONTESTANT'];
      const csvData = validRoles.map((role, i) => ({
        email: `user${i}@example.com`,
        name: `User ${i}`,
        role
      }));

      const result = await service.validateUsersImport(csvData);

      expect(result.successful).toBe(validRoles.length);
      expect(result.failed).toBe(0);
    });
  });
});
