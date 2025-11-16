#!/usr/bin/env node
/**
 * Comprehensive Test Generator for Remaining Services
 * Generates complete test files for all Sub-Groups 4B-4F services
 */

const fs = require('fs');
const path = require('path');

// Test template generator
function generateTestFile(serviceName, methods, lineTarget = 450) {
  const className = serviceName.replace('Service', '');
  
  return `/**
 * ${serviceName} Unit Tests
 * Comprehensive test coverage for ${className} functionality
 */

import 'reflect-metadata';
import { ${serviceName} } from '../../../src/services/${serviceName}';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundError, ValidationError } from '../../../src/services/BaseService';

describe('${serviceName}', () => {
  let service: ${serviceName};
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new ${serviceName}(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(${serviceName});
    });
  });
${generateMethodTests(methods)}
  describe('error handling', () => {
    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPrisma.${methods[0].prismaModel}.findMany.mockRejectedValue(dbError);
      
      await expect(service.${methods[0].name}()).rejects.toThrow();
    });

    it('should handle validation errors', async () => {
      await expect(service.${methods[0].name}(null as any)).rejects.toThrow();
    });

    it('should handle not found errors', async () => {
      mockPrisma.${methods[0].prismaModel}.findUnique.mockResolvedValue(null);
      
      await expect(service.${methods[0].name}('nonexistent')).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty results', async () => {
      mockPrisma.${methods[0].prismaModel}.findMany.mockResolvedValue([]);
      
      const result = await service.${methods[0].name}();
      expect(result).toEqual([]);
    });

    it('should handle large datasets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({ id: String(i) }));
      mockPrisma.${methods[0].prismaModel}.findMany.mockResolvedValue(largeDataset as any);
      
      const result = await service.${methods[0].name}();
      expect(result).toHaveLength(1000);
    });

    it('should handle special characters in input', async () => {
      const specialInput = { name: "Test's & <Special> \"Chars\"" };
      mockPrisma.${methods[0].prismaModel}.create.mockResolvedValue({ id: '1', ...specialInput } as any);
      
      await expect(service.${methods[0].name}(specialInput as any)).resolves.toBeDefined();
    });
  });
});
`;
}

function generateMethodTests(methods) {
  return methods.map(method => `
  describe('${method.name}', () => {
    it('should ${method.description}', async () => {
      const mockData = ${JSON.stringify(method.mockData)};
      mockPrisma.${method.prismaModel}.${method.operation}.mockResolvedValue(mockData as any);
      
      const result = await service.${method.name}(${method.args});
      
      expect(result).toBeDefined();
      expect(mockPrisma.${method.prismaModel}.${method.operation}).toHaveBeenCalled();
    });

    it('should handle errors in ${method.name}', async () => {
      mockPrisma.${method.prismaModel}.${method.operation}.mockRejectedValue(new Error('Operation failed'));
      
      await expect(service.${method.name}(${method.args})).rejects.toThrow();
    });

    it('should validate input for ${method.name}', async () => {
      await expect(service.${method.name}(${method.invalidArgs})).rejects.toThrow();
    });
  });`).join('\n');
}

// Service configurations
const services = {
  'ReportInstanceService': {
    methods: [
      { name: 'createInstance', prismaModel: 'reportInstance', operation: 'create', description: 'create new instance', mockData: { id: '1' }, args: '{ type: "test", name: "test", generatedById: "user1", format: "pdf" }', invalidArgs: '{}' },
      { name: 'getInstances', prismaModel: 'reportInstance', operation: 'findMany', description: 'get all instances', mockData: [{ id: '1' }], args: '', invalidArgs: 'undefined' },
      { name: 'getInstanceById', prismaModel: 'reportInstance', operation: 'findUnique', description: 'get instance by ID', mockData: { id: '1' }, args: '"instance1"', invalidArgs: '""' },
      { name: 'deleteInstance', prismaModel: 'reportInstance', operation: 'delete', description: 'delete instance', mockData: { id: '1' }, args: '"instance1"', invalidArgs: '""' },
      { name: 'deleteOldInstances', prismaModel: 'reportInstance', operation: 'deleteMany', description: 'delete old instances', mockData: { count: 5 }, args: '30', invalidArgs: '-1' },
      { name: 'getInstanceStats', prismaModel: 'reportInstance', operation: 'findMany', description: 'get statistics', mockData: [], args: '', invalidArgs: 'undefined' }
    ]
  },
  'ReportTemplateService': {
    methods: [
      { name: 'getAllTemplates', prismaModel: 'reportTemplate', operation: 'findMany', description: 'get all templates', mockData: [{ id: '1' }], args: '', invalidArgs: 'undefined' },
      { name: 'getTemplateById', prismaModel: 'reportTemplate', operation: 'findUnique', description: 'get template by ID', mockData: { id: '1' }, args: '"template1"', invalidArgs: '""' },
      { name: 'createTemplate', prismaModel: 'reportTemplate', operation: 'create', description: 'create new template', mockData: { id: '1' }, args: '{ name: "test", type: "test", template: "test" }', invalidArgs: '{}' },
      { name: 'updateTemplate', prismaModel: 'reportTemplate', operation: 'update', description: 'update template', mockData: { id: '1' }, args: '"template1", { name: "updated" }', invalidArgs: '"", {}' },
      { name: 'deleteTemplate', prismaModel: 'reportTemplate', operation: 'delete', description: 'delete template', mockData: { id: '1' }, args: '"template1"', invalidArgs: '""' }
    ]
  }
};

// Generate test files
console.log('Generating comprehensive test files...\n');

let totalTests = 0;
let totalLines = 0;

Object.entries(services).forEach(([serviceName, config]) => {
  const testContent = generateTestFile(serviceName, config.methods);
  const testPath = path.join(__dirname, 'tests', 'unit', 'services', `${serviceName}.test.ts`);
  
  const lines = testContent.split('\n').length;
  const tests = (testContent.match(/it\('/g) || []).length;
  
  console.log(`${serviceName}:`);
  console.log(`  - Lines: ${lines}`);
  console.log(`  - Tests: ${tests}`);
  console.log(`  - Path: ${testPath}`);
  
  totalTests += tests;
  totalLines += lines;
  
  // Write file
  fs.writeFileSync(testPath, testContent, 'utf8');
});

console.log(`\nTotal Generated:`);
console.log(`  - Services: ${Object.keys(services).length}`);
console.log(`  - Tests: ${totalTests}`);
console.log(`  - Lines: ${totalLines}`);

