import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class JudgeUncertificationService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getUncertificationRequests(status?: string): Promise<({
        judge: {
            id: string;
            name: string;
            email: string;
        };
        category: {
            [x: string]: ({
                id: string;
                tenantId: string;
                judgeId: string;
                categoryId: string | null;
                contestId: string;
                eventId: string;
                status: import(".prisma/client").$Enums.AssignmentStatus;
                assignedAt: Date;
                assignedBy: string;
                notes: string | null;
                priority: number;
            } | {
                id: string;
                tenantId: string;
                judgeId: string;
                categoryId: string | null;
                contestId: string;
                eventId: string;
                status: import(".prisma/client").$Enums.AssignmentStatus;
                assignedAt: Date;
                assignedBy: string;
                notes: string | null;
                priority: number;
            })[] | ({
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                categoryId: string | null;
                contestId: string | null;
                eventId: string | null;
                title: string;
                content: string;
                order: number | null;
                file_path: string | null;
            } | {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                categoryId: string | null;
                contestId: string | null;
                eventId: string | null;
                title: string;
                content: string;
                order: number | null;
                file_path: string | null;
            })[] | {
                id: string;
                tenantId: string;
                judgeId: string;
                categoryId: string | null;
                contestId: string;
                eventId: string;
                status: import(".prisma/client").$Enums.AssignmentStatus;
                assignedAt: Date;
                assignedBy: string;
                notes: string | null;
                priority: number;
            }[] | {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                categoryId: string | null;
                contestId: string | null;
                eventId: string | null;
                title: string;
                content: string;
                order: number | null;
                file_path: string | null;
            }[] | {
                id: string;
                contestantId: string;
                comment: string | null;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                score: number | null;
                criterionId: string | null;
                judgeId: string;
                categoryId: string;
                allowCommentEdit: boolean;
                certifiedAt: Date | null;
                certifiedBy: string | null;
                isCertified: boolean;
                isLocked: boolean;
                lockedAt: Date | null;
                lockedBy: string | null;
            }[] | {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                name: string;
                categoryId: string;
                maxScore: number;
            }[] | {
                contestantId: string;
                tenantId: string;
                categoryId: string;
            }[] | {
                id: string;
                contestantId: string;
                tenantId: string;
                scoreId: string | null;
                judgeId: string;
                categoryId: string;
                status: import(".prisma/client").$Enums.RequestStatus;
                reason: string;
                requestedAt: Date;
                reviewedAt: Date | null;
                reviewedById: string | null;
            }[] | ({
                id: string;
                contestantId: string;
                tenantId: string;
                scoreId: string | null;
                judgeId: string;
                categoryId: string;
                status: import(".prisma/client").$Enums.RequestStatus;
                reason: string;
                requestedAt: Date;
                reviewedAt: Date | null;
                reviewedById: string | null;
            } | {
                id: string;
                contestantId: string;
                tenantId: string;
                scoreId: string | null;
                judgeId: string;
                categoryId: string;
                status: import(".prisma/client").$Enums.RequestStatus;
                reason: string;
                requestedAt: Date;
                reviewedAt: Date | null;
                reviewedById: string | null;
            })[] | {
                id: string;
                tenantId: string;
                categoryId: string;
                certifiedAt: Date;
                role: string;
                userId: string;
                comments: string | null;
                signatureName: string | null;
            }[] | {
                tenantId: string;
                judgeId: string;
                categoryId: string;
            }[] | {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                judgeId: string;
                categoryId: string;
                status: import(".prisma/client").$Enums.RequestStatus;
                reason: string;
                approvedAt: Date | null;
                rejectionReason: string | null;
                requestedAt: Date;
                approvedBy: string | null;
                rejectedBy: string | null;
                rejectedAt: Date | null;
                requestedBy: string;
            }[] | ({
                id: string;
                contestantId: string;
                comment: string | null;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                score: number | null;
                criterionId: string | null;
                judgeId: string;
                categoryId: string;
                allowCommentEdit: boolean;
                certifiedAt: Date | null;
                certifiedBy: string | null;
                isCertified: boolean;
                isLocked: boolean;
                lockedAt: Date | null;
                lockedBy: string | null;
            } | {
                id: string;
                contestantId: string;
                comment: string | null;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                score: number | null;
                criterionId: string | null;
                judgeId: string;
                categoryId: string;
                allowCommentEdit: boolean;
                certifiedAt: Date | null;
                certifiedBy: string | null;
                isCertified: boolean;
                isLocked: boolean;
                lockedAt: Date | null;
                lockedBy: string | null;
            })[] | ({
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                name: string;
                categoryId: string;
                maxScore: number;
            } | {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                name: string;
                categoryId: string;
                maxScore: number;
            })[] | ({
                contestantId: string;
                tenantId: string;
                categoryId: string;
            } | {
                contestantId: string;
                tenantId: string;
                categoryId: string;
            })[] | ({
                tenantId: string;
                judgeId: string;
                categoryId: string;
            } | {
                tenantId: string;
                judgeId: string;
                categoryId: string;
            })[] | ({
                id: string;
                tenantId: string;
                categoryId: string;
                certifiedAt: Date;
                role: string;
                userId: string;
                comments: string | null;
                signatureName: string | null;
            } | {
                id: string;
                tenantId: string;
                categoryId: string;
                certifiedAt: Date;
                role: string;
                userId: string;
                comments: string | null;
                signatureName: string | null;
            })[] | ({
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                judgeId: string;
                categoryId: string;
                status: import(".prisma/client").$Enums.RequestStatus;
                reason: string;
                approvedAt: Date | null;
                rejectionReason: string | null;
                requestedAt: Date;
                approvedBy: string | null;
                rejectedBy: string | null;
                rejectedAt: Date | null;
                requestedBy: string;
            } | {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                judgeId: string;
                categoryId: string;
                status: import(".prisma/client").$Enums.RequestStatus;
                reason: string;
                approvedAt: Date | null;
                rejectionReason: string | null;
                requestedAt: Date;
                approvedBy: string | null;
                rejectedBy: string | null;
                rejectedAt: Date | null;
                requestedBy: string;
            })[] | ({
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                judgeId: string;
                categoryId: string;
                status: import(".prisma/client").$Enums.RequestStatus;
                reason: string;
                requestedAt: Date;
                requestedBy: string;
                tallySignature: string | null;
                tallySignedAt: Date | null;
                tallySignedBy: string | null;
                auditorSignature: string | null;
                auditorSignedAt: Date | null;
                auditorSignedBy: string | null;
                boardSignature: string | null;
                boardSignedAt: Date | null;
                boardSignedBy: string | null;
            } | {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                judgeId: string;
                categoryId: string;
                status: import(".prisma/client").$Enums.RequestStatus;
                reason: string;
                requestedAt: Date;
                requestedBy: string;
                tallySignature: string | null;
                tallySignedAt: Date | null;
                tallySignedBy: string | null;
                auditorSignature: string | null;
                auditorSignedAt: Date | null;
                auditorSignedBy: string | null;
                boardSignature: string | null;
                boardSignedAt: Date | null;
                boardSignedBy: string | null;
            })[] | {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                judgeId: string;
                categoryId: string;
                status: import(".prisma/client").$Enums.RequestStatus;
                reason: string;
                requestedAt: Date;
                requestedBy: string;
                tallySignature: string | null;
                tallySignedAt: Date | null;
                tallySignedBy: string | null;
                auditorSignature: string | null;
                auditorSignedAt: Date | null;
                auditorSignedBy: string | null;
                boardSignature: string | null;
                boardSignedAt: Date | null;
                boardSignedBy: string | null;
            }[];
            [x: number]: never;
            [x: symbol]: never;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            name: string;
            contestId: string;
            description: string | null;
            scoreCap: number | null;
            timeLimit: number | null;
            contestantMin: number | null;
            contestantMax: number | null;
            totalsCertified: boolean;
        };
        requestedByUser: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        judgeId: string;
        categoryId: string;
        status: import(".prisma/client").$Enums.RequestStatus;
        reason: string;
        approvedAt: Date | null;
        rejectionReason: string | null;
        requestedAt: Date;
        approvedBy: string | null;
        rejectedBy: string | null;
        rejectedAt: Date | null;
        requestedBy: string;
    })[]>;
    createUncertificationRequest(data: any): Promise<{
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        judgeId: string;
        categoryId: string;
        status: import(".prisma/client").$Enums.RequestStatus;
        reason: string;
        approvedAt: Date | null;
        rejectionReason: string | null;
        requestedAt: Date;
        approvedBy: string | null;
        rejectedBy: string | null;
        rejectedAt: Date | null;
        requestedBy: string;
    }>;
    signRequest(id: string, data: any): Promise<{
        request: any;
        allSigned: boolean;
    }>;
    executeUncertification(id: string): Promise<{
        message: string;
    }>;
}
//# sourceMappingURL=JudgeUncertificationService.d.ts.map