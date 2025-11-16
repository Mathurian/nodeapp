"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategoryType = exports.updateCategoryType = exports.createCategoryType = exports.getAllCategoryTypes = exports.CategoryTypeController = void 0;
const tsyringe_1 = require("tsyringe");
const CategoryTypeService_1 = require("../services/CategoryTypeService");
const logger_1 = require("../utils/logger");
class CategoryTypeController {
    categoryTypeService;
    constructor() {
        this.categoryTypeService = tsyringe_1.container.resolve(CategoryTypeService_1.CategoryTypeService);
    }
    getAllCategoryTypes = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'categorytype');
        try {
            const categoryTypes = await this.categoryTypeService.getAllCategoryTypes();
            res.json(categoryTypes);
        }
        catch (error) {
            log.error('Get category types error:', error);
            next(error);
        }
    };
    createCategoryType = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'categorytype');
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
        }
        catch (error) {
            log.error('Create category type error:', error);
            next(error);
        }
    };
    updateCategoryType = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'categorytype');
        try {
            const { id } = req.params;
            const { name, description } = req.body;
            if (!id) {
                res.status(400).json({ error: 'Category type ID required' });
                return;
            }
            const categoryType = await this.categoryTypeService.updateCategoryType(id, name, description);
            res.json(categoryType);
        }
        catch (error) {
            log.error('Update category type error:', error);
            next(error);
        }
    };
    deleteCategoryType = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'categorytype');
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'Category type ID required' });
                return;
            }
            await this.categoryTypeService.deleteCategoryType(id);
            res.status(204).send();
        }
        catch (error) {
            log.error('Delete category type error:', error);
            next(error);
        }
    };
}
exports.CategoryTypeController = CategoryTypeController;
const controller = new CategoryTypeController();
exports.getAllCategoryTypes = controller.getAllCategoryTypes;
exports.createCategoryType = controller.createCategoryType;
exports.updateCategoryType = controller.updateCategoryType;
exports.deleteCategoryType = controller.deleteCategoryType;
//# sourceMappingURL=categoryTypeController.js.map