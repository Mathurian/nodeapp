/**
 * Template Service
 * Business logic for category templates
 */

import { injectable, inject } from 'tsyringe';
import { BaseService, NotFoundError } from './BaseService';
import { TemplateRepository, CreateTemplateData, UpdateTemplateData, TemplateWithCriteria } from '../repositories/TemplateRepository';

@injectable()
export class TemplateService extends BaseService {
  constructor(
    @inject('TemplateRepository') private templateRepo: TemplateRepository
  ) {
    super();
  }

  /**
   * Get all templates with criteria
   */
  async getAllTemplates(): Promise<TemplateWithCriteria[]> {
    return await this.templateRepo.findAllWithCriteria();
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<TemplateWithCriteria> {
    this.validateRequired({ id }, ['id']);

    const template = await this.templateRepo.findByIdWithCriteria(id);

    if (!template) {
      throw new NotFoundError('Template', id);
    }

    return template;
  }

  /**
   * Create new template
   */
  async createTemplate(data: CreateTemplateData): Promise<TemplateWithCriteria> {
    this.validateRequired(data, ['name']);

    return await this.templateRepo.createWithCriteria(data);
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, data: UpdateTemplateData): Promise<TemplateWithCriteria> {
    this.validateRequired({ id }, ['id']);

    // Verify template exists
    await this.getTemplateById(id);

    return await this.templateRepo.updateWithCriteria(id, data);
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<void> {
    this.validateRequired({ id }, ['id']);

    // Verify template exists
    await this.getTemplateById(id);

    await this.templateRepo.delete(id);
  }

  /**
   * Duplicate template
   */
  async duplicateTemplate(id: string): Promise<TemplateWithCriteria> {
    this.validateRequired({ id }, ['id']);

    const duplicated = await this.templateRepo.duplicateTemplate(id);

    if (!duplicated) {
      throw new NotFoundError('Template', id);
    }

    return duplicated;
  }
}
