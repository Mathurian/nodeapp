/**
 * EmailTemplateService Unit Tests
 * Comprehensive tests for email template service
 */

import 'reflect-metadata';
import { EmailTemplateService } from '../../../src/services/EmailTemplateService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockTemplate = {
    id: 'template-1',
    name: 'Welcome Email',
    subject: 'Welcome {{user_name}}!',
    body: '<p>Hello {{user_name}}, welcome to {{event_name}}!</p>',
    type: 'WELCOME',
    eventId: 'event-1',
    variables: JSON.stringify(['user_name', 'event_name']),
    headerHtml: '<h1>Welcome</h1>',
    footerHtml: '<p>Best regards</p>',
    logoUrl: 'https://example.com/logo.png',
    logoPosition: 'center',
    backgroundColor: '#f5f5f5',
    primaryColor: '#007bff',
    textColor: '#333333',
    fontFamily: 'Arial',
    fontSize: '14px',
    layoutType: 'simple',
    contentWrapper: 'div',
    borderStyle: 'solid',
    borderColor: '#dddddd',
    borderWidth: '1px',
    borderRadius: '4px',
    padding: '20px',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new EmailTemplateService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('createEmailTemplate', () => {
    it('should create a template with required fields', async () => {
      mockPrisma.emailTemplate.create.mockResolvedValue(mockTemplate);

      const result = await service.createEmailTemplate({
        name: 'Welcome Email',
        subject: 'Welcome!',
        body: '<p>Hello!</p>',
        createdBy: 'user-1',
      });

      expect(result).toEqual(mockTemplate);
      expect(mockPrisma.emailTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Welcome Email',
          subject: 'Welcome!',
          body: '<p>Hello!</p>',
          type: 'CUSTOM',
          createdBy: 'user-1',
        }),
      });
    });

    it('should create a template with all fields', async () => {
      mockPrisma.emailTemplate.create.mockResolvedValue(mockTemplate);

      const result = await service.createEmailTemplate({
        name: 'Welcome Email',
        subject: 'Welcome {{user_name}}!',
        body: '<p>Hello {{user_name}}!</p>',
        type: 'WELCOME',
        eventId: 'event-1',
        variables: ['user_name', 'event_name'],
        headerHtml: '<h1>Header</h1>',
        footerHtml: '<p>Footer</p>',
        logoUrl: 'https://example.com/logo.png',
        logoPosition: 'center',
        backgroundColor: '#ffffff',
        primaryColor: '#007bff',
        textColor: '#000000',
        fontFamily: 'Arial',
        fontSize: '14px',
        layoutType: 'modern',
        contentWrapper: 'div',
        borderStyle: 'solid',
        borderColor: '#ddd',
        borderWidth: '1px',
        borderRadius: '4px',
        padding: '20px',
        createdBy: 'user-1',
      });

      expect(result).toEqual(mockTemplate);
      expect(mockPrisma.emailTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          variables: JSON.stringify(['user_name', 'event_name']),
          headerHtml: '<h1>Header</h1>',
        }),
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.emailTemplate.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createEmailTemplate({
          name: 'Test',
          subject: 'Test',
          body: 'Test',
          createdBy: 'user-1',
        })
      ).rejects.toThrow('Failed to create email template');
    });
  });

  describe('getAllEmailTemplates', () => {
    it('should get all templates without eventId filter', async () => {
      mockPrisma.emailTemplate.findMany.mockResolvedValue([mockTemplate]);

      const result = await service.getAllEmailTemplates();

      expect(result).toEqual([mockTemplate]);
      expect(mockPrisma.emailTemplate.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should get templates for specific event including global', async () => {
      mockPrisma.emailTemplate.findMany.mockResolvedValue([mockTemplate]);

      const result = await service.getAllEmailTemplates('event-1');

      expect(result).toEqual([mockTemplate]);
      expect(mockPrisma.emailTemplate.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ eventId: 'event-1' }, { eventId: null }],
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no templates exist', async () => {
      mockPrisma.emailTemplate.findMany.mockResolvedValue([]);

      const result = await service.getAllEmailTemplates();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPrisma.emailTemplate.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getAllEmailTemplates()).rejects.toThrow('Failed to fetch email templates');
    });
  });

  describe('getEmailTemplateById', () => {
    it('should get a template by id', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);

      const result = await service.getEmailTemplateById('template-1');

      expect(result).toEqual(mockTemplate);
      expect(mockPrisma.emailTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'template-1' },
      });
    });

    it('should return null when template not found', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);

      const result = await service.getEmailTemplateById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockPrisma.emailTemplate.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.getEmailTemplateById('template-1')).rejects.toThrow(
        'Failed to fetch email template'
      );
    });
  });

  describe('getEmailTemplatesByType', () => {
    it('should get templates by type', async () => {
      mockPrisma.emailTemplate.findMany.mockResolvedValue([mockTemplate]);

      const result = await service.getEmailTemplatesByType('WELCOME');

      expect(result).toEqual([mockTemplate]);
      expect(mockPrisma.emailTemplate.findMany).toHaveBeenCalledWith({
        where: { type: 'WELCOME' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should get templates by type for specific event', async () => {
      mockPrisma.emailTemplate.findMany.mockResolvedValue([mockTemplate]);

      const result = await service.getEmailTemplatesByType('WELCOME', 'event-1');

      expect(result).toEqual([mockTemplate]);
      expect(mockPrisma.emailTemplate.findMany).toHaveBeenCalledWith({
        where: {
          type: 'WELCOME',
          OR: [{ eventId: 'event-1' }, { eventId: null }],
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.emailTemplate.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getEmailTemplatesByType('WELCOME')).rejects.toThrow(
        'Failed to fetch email templates'
      );
    });
  });

  describe('updateEmailTemplate', () => {
    it('should update template with partial data', async () => {
      const updated = { ...mockTemplate, name: 'Updated Name' };
      mockPrisma.emailTemplate.update.mockResolvedValue(updated);

      const result = await service.updateEmailTemplate('template-1', { name: 'Updated Name' });

      expect(result).toEqual(updated);
      expect(mockPrisma.emailTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: { name: 'Updated Name' },
      });
    });

    it('should update all fields', async () => {
      mockPrisma.emailTemplate.update.mockResolvedValue(mockTemplate);

      const result = await service.updateEmailTemplate('template-1', {
        name: 'New Name',
        subject: 'New Subject',
        body: 'New Body',
        type: 'CUSTOM',
        variables: ['var1'],
        backgroundColor: '#fff',
      });

      expect(result).toEqual(mockTemplate);
      expect(mockPrisma.emailTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: expect.objectContaining({
          name: 'New Name',
          variables: JSON.stringify(['var1']),
        }),
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.emailTemplate.update.mockRejectedValue(new Error('Database error'));

      await expect(service.updateEmailTemplate('template-1', { name: 'Test' })).rejects.toThrow(
        'Failed to update email template'
      );
    });
  });

  describe('deleteEmailTemplate', () => {
    it('should delete a template', async () => {
      mockPrisma.emailTemplate.delete.mockResolvedValue(mockTemplate);

      await service.deleteEmailTemplate('template-1');

      expect(mockPrisma.emailTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'template-1' },
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.emailTemplate.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.deleteEmailTemplate('template-1')).rejects.toThrow(
        'Failed to delete email template'
      );
    });
  });

  describe('renderTemplate', () => {
    it('should replace variables in subject and body', () => {
      const result = service.renderTemplate(mockTemplate, {
        user_name: 'John Doe',
        event_name: 'Summer Festival',
      });

      expect(result.subject).toBe('Welcome John Doe!');
      expect(result.html).toContain('Hello John Doe');
      expect(result.html).toContain('Summer Festival');
    });

    it('should build complete HTML with styling', () => {
      const result = service.renderTemplate(mockTemplate, {
        user_name: 'John Doe',
        event_name: 'Summer Festival',
      });

      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('email-container');
      expect(result.html).toContain(mockTemplate.backgroundColor);
      expect(result.html).toContain(mockTemplate.primaryColor);
    });

    it('should include custom header when provided', () => {
      const result = service.renderTemplate(mockTemplate, {
        user_name: 'John Doe',
        event_name: 'Summer Festival',
      });

      expect(result.html).toContain('<h1>Welcome</h1>');
    });

    it('should include custom footer when provided', () => {
      const result = service.renderTemplate(mockTemplate, {
        user_name: 'John Doe',
        event_name: 'Summer Festival',
      });

      expect(result.html).toContain('<p>Best regards</p>');
    });

    it('should include logo when no header HTML provided', () => {
      const templateWithLogo = { ...mockTemplate, headerHtml: null };
      const result = service.renderTemplate(templateWithLogo, {
        user_name: 'John Doe',
      });

      expect(result.html).toContain('logo.png');
      expect(result.html).toContain('img');
    });

    it('should use default footer when no footer HTML provided', () => {
      const templateNoFooter = { ...mockTemplate, footerHtml: null };
      const result = service.renderTemplate(templateNoFooter, {
        user_name: 'John Doe',
      });

      expect(result.html).toContain('Event Manager');
      expect(result.html).toContain(new Date().getFullYear().toString());
    });

    it('should handle templates with no variables', () => {
      const simpleTemplate = {
        ...mockTemplate,
        subject: 'Static Subject',
        body: 'Static Body',
      };
      const result = service.renderTemplate(simpleTemplate, {});

      expect(result.subject).toBe('Static Subject');
      expect(result.html).toContain('Static Body');
    });

    it('should handle rendering errors', () => {
      const badTemplate = { ...mockTemplate, subject: null, body: null } as any;

      expect(() =>
        service.renderTemplate(badTemplate, { user_name: 'Test' })
      ).toThrow('Failed to render email template');
    });
  });

  describe('getAvailableVariables', () => {
    it('should return common variables for all types', () => {
      const result = service.getAvailableVariables('CUSTOM');

      expect(result).toContain('user_name');
      expect(result).toContain('user_email');
      expect(result).toContain('event_name');
      expect(result).toContain('current_date');
    });

    it('should return WELCOME specific variables', () => {
      const result = service.getAvailableVariables('WELCOME');

      expect(result).toContain('activation_link');
      expect(result).toContain('password');
    });

    it('should return PASSWORD_RESET specific variables', () => {
      const result = service.getAvailableVariables('PASSWORD_RESET');

      expect(result).toContain('reset_link');
      expect(result).toContain('reset_code');
    });

    it('should return EVENT_INVITATION specific variables', () => {
      const result = service.getAvailableVariables('EVENT_INVITATION');

      expect(result).toContain('event_location');
      expect(result).toContain('rsvp_link');
    });

    it('should return RESULT_NOTIFICATION specific variables', () => {
      const result = service.getAvailableVariables('RESULT_NOTIFICATION');

      expect(result).toContain('contest_name');
      expect(result).toContain('score');
      expect(result).toContain('rank');
    });

    it('should return only common variables for unknown types', () => {
      const result = service.getAvailableVariables('UNKNOWN_TYPE');

      expect(result).toContain('user_name');
      expect(result.length).toBe(6); // Only common variables
    });
  });

  describe('cloneEmailTemplate', () => {
    it('should clone a template with new name', async () => {
      const cloned = { ...mockTemplate, id: 'template-2', name: 'Welcome Email (Copy)' };
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrisma.emailTemplate.create.mockResolvedValue(cloned);

      const result = await service.cloneEmailTemplate('template-1', 'user-2');

      expect(result.name).toBe('Welcome Email (Copy)');
      expect(mockPrisma.emailTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'template-1' },
      });
      expect(mockPrisma.emailTemplate.create).toHaveBeenCalled();
    });

    it('should throw error when template not found', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);

      await expect(service.cloneEmailTemplate('nonexistent', 'user-1')).rejects.toThrow(
        'Template not found'
      );
    });

    it('should handle database errors', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrisma.emailTemplate.create.mockRejectedValue(new Error('Database error'));

      await expect(service.cloneEmailTemplate('template-1', 'user-1')).rejects.toThrow(
        'Failed to clone email template'
      );
    });
  });

  describe('previewEmailTemplate', () => {
    it('should preview template with sample variables', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);

      const result = await service.previewEmailTemplate('template-1');

      expect(result.subject).toContain('John Doe');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('Sample Event');
    });

    it('should preview template with custom variables', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(mockTemplate);

      const result = await service.previewEmailTemplate('template-1', {
        user_name: 'Jane Smith',
        event_name: 'Winter Festival',
      });

      expect(result.subject).toContain('Jane Smith');
      expect(result.html).toContain('Winter Festival');
    });

    it('should throw error when template not found', async () => {
      mockPrisma.emailTemplate.findUnique.mockResolvedValue(null);

      await expect(service.previewEmailTemplate('nonexistent')).rejects.toThrow(
        'Template not found'
      );
    });

    it('should handle database errors', async () => {
      mockPrisma.emailTemplate.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.previewEmailTemplate('template-1')).rejects.toThrow(
        'Failed to preview email template'
      );
    });
  });
});
