"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandlingService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
let ErrorHandlingService = class ErrorHandlingService extends BaseService_1.BaseService {
    logError(error, context) {
        console.error('Error logged:', error, context);
        let errorMessage;
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        else if (typeof error === 'string') {
            errorMessage = error;
        }
        else if (error === null) {
            errorMessage = 'null';
        }
        else if (error === undefined) {
            errorMessage = 'undefined';
        }
        else {
            errorMessage = String(error);
        }
        return {
            logged: true,
            timestamp: new Date(),
            error: errorMessage
        };
    }
    getErrorStats() {
        return {
            total: 0,
            last24Hours: 0,
            byType: {}
        };
    }
};
exports.ErrorHandlingService = ErrorHandlingService;
exports.ErrorHandlingService = ErrorHandlingService = __decorate([
    (0, tsyringe_1.injectable)()
], ErrorHandlingService);
//# sourceMappingURL=ErrorHandlingService.js.map