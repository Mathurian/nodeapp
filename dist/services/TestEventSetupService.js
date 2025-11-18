"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestEventSetupService = void 0;
const client_1 = require("@prisma/client");
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const bcrypt = __importStar(require("bcryptjs"));
let TestEventSetupService = class TestEventSetupService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async createTestEvent(config, userId, userRole) {
        if (userRole !== 'ADMIN') {
            throw this.forbiddenError('Only administrators can create test events');
        }
        const { eventName = `Test Event ${Date.now()}`, contestCount = 2, categoriesPerContest = 3, contestantsPerCategory = 5, judgesPerCategory = 3, tallyMastersPerContest = 1, auditorsPerContest = 1, boardUsers = 2, organizers = 2, assignJudgesToCategories = true, assignContestantsToCategories = true } = config;
        if (contestCount < 1 || contestCount > 10) {
            throw this.validationError('contestCount must be between 1 and 10');
        }
        if (categoriesPerContest < 1 || categoriesPerContest > 10) {
            throw this.validationError('categoriesPerContest must be between 1 and 10');
        }
        if (contestantsPerCategory < 1 || contestantsPerCategory > 20) {
            throw this.validationError('contestantsPerCategory must be between 1 and 20');
        }
        if (judgesPerCategory < 1 || judgesPerCategory > 10) {
            throw this.validationError('judgesPerCategory must be between 1 and 10');
        }
        const hashedPassword = await bcrypt.hash('password123', 10);
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);
        const result = await this.prisma.$transaction(async (tx) => {
            const event = await tx.event.create({
                data: {
                    tenantId: 'default_tenant',
                    name: eventName,
                    description: 'Test event created by test setup service',
                    startDate,
                    endDate,
                    location: 'Test Location'
                }
            });
            const organizerUsers = [];
            for (let i = 0; i < organizers; i++) {
                const user = await tx.user.create({
                    data: {
                        tenantId: 'default_tenant',
                        name: `Test Organizer ${i + 1}`,
                        email: `testorganizer${i + 1}@test.com`,
                        password: hashedPassword,
                        role: 'ORGANIZER',
                        isActive: true
                    }
                });
                organizerUsers.push(user);
            }
            const boardUserList = [];
            for (let i = 0; i < boardUsers; i++) {
                const user = await tx.user.create({
                    data: {
                        tenantId: 'default_tenant',
                        name: `Test Board ${i + 1}`,
                        email: `testboard${i + 1}@test.com`,
                        password: hashedPassword,
                        role: 'BOARD',
                        isActive: true
                    }
                });
                boardUserList.push(user);
            }
            const contests = [];
            for (let c = 0; c < contestCount; c++) {
                const contest = await tx.contest.create({
                    data: {
                        tenantId: 'default_tenant',
                        eventId: event.id,
                        name: `Test Contest ${c + 1}`,
                        description: `Test contest ${c + 1} description`
                    }
                });
                contests.push(contest);
                const tallyMasters = [];
                for (let t = 0; t < tallyMastersPerContest; t++) {
                    const user = await tx.user.create({
                        data: {
                            tenantId: 'default_tenant',
                            name: `Test Tally Master ${c + 1}-${t + 1}`,
                            email: `testtally${c + 1}_${t + 1}@test.com`,
                            password: hashedPassword,
                            role: 'TALLY_MASTER',
                            isActive: true
                        }
                    });
                    tallyMasters.push(user);
                    await tx.roleAssignment.create({
                        data: {
                            tenantId: 'default_tenant',
                            userId: user.id,
                            role: 'TALLY_MASTER',
                            contestId: contest.id,
                            eventId: event.id,
                            assignedBy: userId,
                            isActive: true
                        }
                    });
                }
                const auditors = [];
                for (let a = 0; a < auditorsPerContest; a++) {
                    const user = await tx.user.create({
                        data: {
                            tenantId: 'default_tenant',
                            name: `Test Auditor ${c + 1}-${a + 1}`,
                            email: `testauditor${c + 1}_${a + 1}@test.com`,
                            password: hashedPassword,
                            role: 'AUDITOR',
                            isActive: true
                        }
                    });
                    auditors.push(user);
                    await tx.roleAssignment.create({
                        data: {
                            tenantId: 'default_tenant',
                            userId: user.id,
                            role: 'AUDITOR',
                            contestId: contest.id,
                            eventId: event.id,
                            assignedBy: userId,
                            isActive: true
                        }
                    });
                }
                const categories = [];
                for (let cat = 0; cat < categoriesPerContest; cat++) {
                    const category = await tx.category.create({
                        data: {
                            tenantId: 'default_tenant',
                            contestId: contest.id,
                            name: `Test Category ${c + 1}-${cat + 1}`,
                            description: `Test category ${c + 1}-${cat + 1} description`,
                            scoreCap: 100
                        }
                    });
                    categories.push(category);
                    await tx.criterion.createMany({
                        data: [
                            {
                                tenantId: 'default_tenant',
                                categoryId: category.id,
                                name: 'Criterion 1',
                                maxScore: 30
                            },
                            {
                                tenantId: 'default_tenant',
                                categoryId: category.id,
                                name: 'Criterion 2',
                                maxScore: 40
                            },
                            {
                                tenantId: 'default_tenant',
                                categoryId: category.id,
                                name: 'Criterion 3',
                                maxScore: 30
                            }
                        ]
                    });
                    const judges = [];
                    for (let j = 0; j < judgesPerCategory; j++) {
                        const judge = await tx.judge.create({
                            data: {
                                tenantId: 'default_tenant',
                                name: `Test Judge ${c + 1}-${cat + 1}-${j + 1}`,
                                email: `testjudge${c + 1}_${cat + 1}_${j + 1}@test.com`,
                                bio: `Test judge bio ${c + 1}-${cat + 1}-${j + 1}`
                            }
                        });
                        judges.push(judge);
                        const judgeUser = await tx.user.create({
                            data: {
                                tenantId: 'default_tenant',
                                name: judge.name,
                                email: judge.email || `judge${judge.id}@test.com`,
                                password: hashedPassword,
                                role: 'JUDGE',
                                isActive: true
                            }
                        });
                        await tx.user.update({
                            where: { id: judgeUser.id },
                            data: { judgeId: judge.id }
                        });
                        if (assignJudgesToCategories) {
                            await tx.categoryJudge.create({
                                data: {
                                    tenantId: 'default_tenant',
                                    categoryId: category.id,
                                    judgeId: judge.id
                                }
                            });
                        }
                    }
                    const contestants = [];
                    for (let cont = 0; cont < contestantsPerCategory; cont++) {
                        const contestant = await tx.contestant.create({
                            data: {
                                tenantId: 'default_tenant',
                                name: `Test Contestant ${c + 1}-${cat + 1}-${cont + 1}`,
                                email: `testcontestant${c + 1}_${cat + 1}_${cont + 1}@test.com`,
                                bio: `Test contestant bio ${c + 1}-${cat + 1}-${cont + 1}`,
                                contestantNumber: cont + 1
                            }
                        });
                        contestants.push(contestant);
                        const contestantUser = await tx.user.create({
                            data: {
                                tenantId: 'default_tenant',
                                name: contestant.name,
                                email: contestant.email || `contestant${contestant.id}@test.com`,
                                password: hashedPassword,
                                role: 'CONTESTANT',
                                isActive: true
                            }
                        });
                        await tx.user.update({
                            where: { id: contestantUser.id },
                            data: { contestantId: contestant.id }
                        });
                        if (assignContestantsToCategories) {
                            await tx.categoryContestant.create({
                                data: {
                                    tenantId: 'default_tenant',
                                    categoryId: category.id,
                                    contestantId: contestant.id
                                }
                            });
                            await tx.contestContestant.create({
                                data: {
                                    tenantId: 'default_tenant',
                                    contestId: contest.id,
                                    contestantId: contestant.id
                                }
                            });
                        }
                    }
                }
            }
            return {
                eventId: event.id,
                message: `Test event created successfully with ${contestCount} contests, ${categoriesPerContest} categories per contest, ${contestantsPerCategory} contestants per category, ${judgesPerCategory} judges per category`
            };
        });
        this.logInfo('Test event created', { eventId: result.eventId, userId });
        return result;
    }
};
exports.TestEventSetupService = TestEventSetupService;
exports.TestEventSetupService = TestEventSetupService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], TestEventSetupService);
//# sourceMappingURL=TestEventSetupService.js.map