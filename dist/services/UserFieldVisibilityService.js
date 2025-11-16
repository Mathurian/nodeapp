"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserFieldVisibilityService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const prisma_1 = __importDefault(require("../utils/prisma"));
let UserFieldVisibilityService = class UserFieldVisibilityService extends BaseService_1.BaseService {
    getDefaultFieldVisibility() {
        return {
            name: { visible: true, required: true },
            email: { visible: true, required: true },
            role: { visible: true, required: true },
            phone: { visible: true, required: false },
            address: { visible: true, required: false },
            bio: { visible: true, required: false },
            preferredName: { visible: true, required: false },
            pronouns: { visible: true, required: false },
            gender: { visible: true, required: false },
            judgeNumber: { visible: true, required: false },
            judgeLevel: { visible: true, required: false },
            isHeadJudge: { visible: true, required: false },
            contestantNumber: { visible: true, required: false },
            age: { visible: true, required: false },
            school: { visible: true, required: false },
            grade: { visible: true, required: false },
            parentGuardian: { visible: true, required: false },
            parentPhone: { visible: true, required: false },
        };
    }
    async getFieldVisibilitySettings() {
        const settings = await prisma_1.default.systemSetting.findMany({
            where: {
                key: {
                    startsWith: 'user_field_visibility_',
                },
            },
        });
        const fieldVisibility = this.getDefaultFieldVisibility();
        settings.forEach((setting) => {
            const fieldName = setting.key.replace('user_field_visibility_', '');
            try {
                fieldVisibility[fieldName] = JSON.parse(setting.value);
            }
            catch (e) {
            }
        });
        return fieldVisibility;
    }
    async updateFieldVisibility(field, visible, required, userId) {
        this.validateRequired({ field, visible }, ['field', 'visible']);
        const value = JSON.stringify({ visible, required: required || false });
        await prisma_1.default.systemSetting.upsert({
            where: {
                key: `user_field_visibility_${field}`,
            },
            update: {
                value: value,
                updatedBy: userId,
            },
            create: {
                key: `user_field_visibility_${field}`,
                value: value,
                description: `Visibility setting for user field: ${field}`,
                category: 'user_fields',
                updatedBy: userId,
            },
        });
        return {
            message: 'Field visibility updated successfully',
            field,
            visible,
            required: required || false,
        };
    }
    async resetFieldVisibility() {
        await prisma_1.default.systemSetting.deleteMany({
            where: {
                key: {
                    startsWith: 'user_field_visibility_',
                },
            },
        });
        return { message: 'Field visibility reset to defaults successfully' };
    }
};
exports.UserFieldVisibilityService = UserFieldVisibilityService;
exports.UserFieldVisibilityService = UserFieldVisibilityService = __decorate([
    (0, tsyringe_1.injectable)()
], UserFieldVisibilityService);
//# sourceMappingURL=UserFieldVisibilityService.js.map