"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRoleAssignment = exports.updateRoleAssignment = exports.createRoleAssignment = exports.getAllRoleAssignments = exports.RoleAssignmentController = void 0;
const container_1 = require("../config/container");
const RoleAssignmentService_1 = require("../services/RoleAssignmentService");
const responseHelpers_1 = require("../utils/responseHelpers");
class RoleAssignmentController {
    roleAssignmentService;
    constructor() {
        this.roleAssignmentService = container_1.container.resolve(RoleAssignmentService_1.RoleAssignmentService);
    }
    getAllRoleAssignments = async (req, res, next) => {
        try {
            const { role, contestId, eventId, categoryId } = req.query;
            const assignments = await this.roleAssignmentService.getAll({
                role: role,
                contestId: contestId,
                eventId: eventId,
                categoryId: categoryId
            });
            return (0, responseHelpers_1.sendSuccess)(res, assignments);
        }
        catch (error) {
            return next(error);
        }
    };
    createRoleAssignment = async (req, res, next) => {
        try {
            const { userId, role, contestId, eventId, categoryId, notes } = req.body;
            const assignment = await this.roleAssignmentService.create({
                userId,
                role,
                contestId,
                eventId,
                categoryId,
                notes,
                assignedBy: req.user.id
            });
            return (0, responseHelpers_1.sendSuccess)(res, assignment, 'Role assignment created', 201);
        }
        catch (error) {
            return next(error);
        }
    };
    updateRoleAssignment = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { notes, isActive } = req.body;
            const assignment = await this.roleAssignmentService.update(id, { notes, isActive });
            return (0, responseHelpers_1.sendSuccess)(res, assignment, 'Role assignment updated');
        }
        catch (error) {
            return next(error);
        }
    };
    deleteRoleAssignment = async (req, res, next) => {
        try {
            const { id } = req.params;
            await this.roleAssignmentService.delete(id);
            return (0, responseHelpers_1.sendSuccess)(res, null, 'Role assignment deleted');
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.RoleAssignmentController = RoleAssignmentController;
const controller = new RoleAssignmentController();
exports.getAllRoleAssignments = controller.getAllRoleAssignments;
exports.createRoleAssignment = controller.createRoleAssignment;
exports.updateRoleAssignment = controller.updateRoleAssignment;
exports.deleteRoleAssignment = controller.deleteRoleAssignment;
//# sourceMappingURL=roleAssignmentController.js.map