"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationHandler = void 0;
const client_1 = require("@prisma/client");
const EventBusService_1 = require("../EventBusService");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('NotificationHandler');
const prisma = new client_1.PrismaClient();
class NotificationHandler {
    static handler = async (event) => {
        try {
            switch (event.type) {
                case EventBusService_1.AppEventType.ASSIGNMENT_CREATED:
                    await handleAssignmentCreated(event);
                    break;
                case EventBusService_1.AppEventType.SCORE_SUBMITTED:
                    await handleScoreSubmitted(event);
                    break;
                case EventBusService_1.AppEventType.SCORES_FINALIZED:
                    await handleScoresFinalized(event);
                    break;
                case EventBusService_1.AppEventType.CERTIFICATION_APPROVED:
                case EventBusService_1.AppEventType.CERTIFICATION_REJECTED:
                    await handleCertificationUpdate(event);
                    break;
                case EventBusService_1.AppEventType.CONTEST_CERTIFIED:
                    await handleContestCertified(event);
                    break;
                default:
                    break;
            }
        }
        catch (error) {
            logger.error('Failed to create notification', { error, event: event.type });
        }
    };
}
exports.NotificationHandler = NotificationHandler;
async function handleAssignmentCreated(event) {
    const { userId, assignmentType, contestName, categoryName } = event.payload;
    if (!userId)
        return;
    await prisma.notification.create({
        data: {
            tenantId: 'default_tenant',
            userId,
            type: 'INFO',
            title: 'New Assignment',
            message: `You have been assigned as ${assignmentType} for ${contestName} - ${categoryName}`,
            link: `/assignments`,
        },
    });
    logger.debug('Assignment notification created', { userId });
}
async function handleScoreSubmitted(event) {
    const { contestantId, judgeName, categoryName, score } = event.payload;
    if (!contestantId)
        return;
    const contestant = await prisma.contestant.findUnique({
        where: { id: contestantId },
        include: { users: true },
    });
    if (contestant?.users && contestant.users.length > 0) {
        const user = contestant.users[0];
        await prisma.notification.create({
            data: {
                tenantId: 'default_tenant',
                userId: user.id,
                type: 'SUCCESS',
                title: 'Score Received',
                message: `${judgeName} has submitted a score of ${score} for ${categoryName}`,
                link: `/results`,
            },
        });
        logger.debug('Score notification created', { userId: user.id });
    }
}
async function handleScoresFinalized(event) {
    const { categoryId, categoryName, contestantIds } = event.payload;
    if (!contestantIds || contestantIds.length === 0)
        return;
    const contestants = await prisma.contestant.findMany({
        where: { id: { in: contestantIds } },
        include: { users: true },
    });
    const notifications = contestants
        .filter((c) => c.users && c.users.length > 0)
        .map((contestant) => ({
        tenantId: 'default_tenant',
        userId: contestant.users[0].id,
        type: 'SUCCESS',
        title: 'Results Available',
        message: `Final results are now available for ${categoryName}`,
        link: `/results?category=${categoryId}`,
    }));
    if (notifications.length > 0) {
        await prisma.notification.createMany({ data: notifications });
        logger.debug('Finalized score notifications created', { count: notifications.length });
    }
}
async function handleCertificationUpdate(event) {
    const { userId, status, categoryName, message } = event.payload;
    if (!userId)
        return;
    const isApproved = event.type === EventBusService_1.AppEventType.CERTIFICATION_APPROVED;
    await prisma.notification.create({
        data: {
            tenantId: 'default_tenant',
            userId,
            type: isApproved ? 'SUCCESS' : 'WARNING',
            title: `Certification ${isApproved ? 'Approved' : 'Rejected'}`,
            message: message || `Your certification for ${categoryName} has been ${isApproved ? 'approved' : 'rejected'}`,
            link: `/certifications`,
        },
    });
    logger.debug('Certification notification created', { userId, status });
}
async function handleContestCertified(event) {
    const { contestId, contestName } = event.payload;
    const adminsAndOrganizers = await prisma.user.findMany({
        where: {
            role: { in: ['ADMIN', 'ORGANIZER', 'BOARD'] },
            isActive: true,
        },
    });
    const notifications = adminsAndOrganizers.map((user) => ({
        tenantId: 'default_tenant',
        userId: user.id,
        type: 'SUCCESS',
        title: 'Contest Certified',
        message: `${contestName} has been fully certified and finalized`,
        link: `/contests/${contestId}`,
    }));
    if (notifications.length > 0) {
        await prisma.notification.createMany({ data: notifications });
        logger.debug('Contest certification notifications created', { count: notifications.length });
    }
}
//# sourceMappingURL=NotificationHandler.js.map