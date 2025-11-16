"use strict";
/**
 * User Repository
 * Data access layer for User entity
 */
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const tsyringe_1 = require("tsyringe");
const BaseRepository_1 = require("./BaseRepository");
let UserRepository = (() => {
    let _classDecorators = [(0, tsyringe_1.injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseRepository_1.BaseRepository;
    var UserRepository = _classThis = class extends _classSuper {
        getModelName() {
            return 'user';
        }
        /**
         * Find user by name
         */
        async findByName(name) {
            return this.findFirst({ name });
        }
        /**
         * Find user by email
         */
        async findByEmail(email) {
            return this.findFirst({ email });
        }
        /**
         * Find user by name or email
         */
        async findByNameOrEmail(nameOrEmail) {
            return this.findFirst({
                OR: [
                    { name: nameOrEmail },
                    { email: nameOrEmail }
                ]
            });
        }
        /**
         * Find users by role
         */
        async findByRole(role) {
            return this.findMany({ role });
        }
        /**
         * Find active users
         */
        async findActiveUsers() {
            return this.findMany({
                isActive: true,
                archived: false
            });
        }
        /**
         * Find users with assignments for an event
         */
        async findUsersWithAssignments(eventId) {
            return this.getModel().findMany({
                where: {
                    assignedAssignments: { some: { eventId } }
                },
                include: {
                    assignedAssignments: {
                        where: { eventId }
                    },
                    contestant: true,
                    judge: true
                }
            });
        }
        /**
         * Search users by name or email
         */
        async searchUsers(query) {
            return this.findMany({
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { preferredName: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } }
                ]
            });
        }
        /**
         * Update user last login
         */
        async updateLastLogin(userId) {
            return this.update(userId, {
                lastLoginAt: new Date()
            });
        }
        /**
         * Update user password
         */
        async updatePassword(userId, hashedPassword) {
            return this.update(userId, {
                password: hashedPassword
            });
        }
        /**
         * Toggle user active status
         */
        async toggleActiveStatus(userId) {
            const user = await this.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }
            return this.update(userId, {
                isActive: !user.isActive
            });
        }
        /**
         * Get user statistics
         */
        async getUserStats(userId) {
            const user = await this.getModel().findUnique({
                where: { id: userId },
                include: {
                    assignedAssignments: {
                        distinct: ['eventId']
                    }
                }
            });
            if (!user) {
                return {
                    totalAssignments: 0,
                    eventsParticipated: 0
                };
            }
            const eventIds = new Set([
                ...user.assignedAssignments.map((a) => a.eventId)
            ]);
            return {
                totalAssignments: user.assignedAssignments.length,
                eventsParticipated: eventIds.size
            };
        }
    };
    __setFunctionName(_classThis, "UserRepository");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UserRepository = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UserRepository = _classThis;
})();
exports.UserRepository = UserRepository;
