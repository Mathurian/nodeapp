import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { CategoryTypeService } from '../services/CategoryTypeService';
import { createRequestLogger } from '../utils/logger';

/**
 * Controller for Category Type management
 * Handles CRUD operations for category types
 */
export class CategoryTypeController {
  private categoryTypeService: CategoryTypeService;

  constructor() {
    this.categoryTypeService = container.resolve(CategoryTypeService);
  }

  /**
   * Get all category types
   */
  getAllCategoryTypes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'categorytype');
    try {
      const categoryTypes = await this.categoryTypeService.getAllCategoryTypes();
      res.json(categoryTypes);
    } catch (error) {
      log.error('Get category types error:', error);
      next(error);
    }
  };

  /**
   * Create a new category type
   */
  createCategoryType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'categorytype');
    try {
      const { name, description } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }

      const categoryType = await this.categoryTypeService.createCategoryType(name, description || null, userId);
      res.status(201).json(categoryType);
    } catch (error) {
      log.error('Create category type error:', error);
      next(error);
    }
  };

  /**
   * Update a category type
   */
  updateCategoryType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'categorytype');
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      if (!id) {
        res.status(400).json({ error: 'Category type ID required' });
        return;
      }

      const categoryType = await this.categoryTypeService.updateCategoryType(id, name, description);
      res.json(categoryType);
    } catch (error) {
      log.error('Update category type error:', error);
      next(error);
    }
  };

  /**
   * Delete a category type
   */
  deleteCategoryType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'categorytype');
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Category type ID required' });
        return;
      }

      await this.categoryTypeService.deleteCategoryType(id);
      res.status(204).send();
    } catch (error) {
      log.error('Delete category type error:', error);
      next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new CategoryTypeController();
export const getAllCategoryTypes = controller.getAllCategoryTypes;
export const createCategoryType = controller.createCategoryType;
export const updateCategoryType = controller.updateCategoryType;
export const deleteCategoryType = controller.deleteCategoryType;
