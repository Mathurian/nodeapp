"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticsHandler = void 0;
const client_1 = require("@prisma/client");
const EventBusService_1 = require("../EventBusService");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('StatisticsHandler');
const prisma = new client_1.PrismaClient();
class StatisticsHandler {
    static handler = async (event) => {
        try {
            switch (event.type) {
                case EventBusService_1.AppEventType.USER_LOGGED_IN:
                    await trackUserLogin(event);
                    break;
                case EventBusService_1.AppEventType.SCORE_SUBMITTED:
                    await trackScoreSubmission(event);
                    break;
                case EventBusService_1.AppEventType.EVENT_CREATED:
                    await trackEventCreation(event);
                    break;
                case EventBusService_1.AppEventType.CONTEST_CERTIFIED:
                    await trackContestCertification(event);
                    break;
                default:
                    break;
            }
        }
        catch (error) {
            logger.error('Failed to update statistics', { error, event: event.type });
        }
    };
}
exports.StatisticsHandler = StatisticsHandler;
async function trackUserLogin(event) {
    const { userId, ipAddress } = event.payload;
    if (!userId)
        return;
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { lastLoginAt: event.metadata.timestamp },
        });
        logger.debug('User login tracked', { userId });
    }
    catch (error) {
        logger.error('Failed to track user login', { error, userId });
    }
}
async function trackScoreSubmission(event) {
    const { judgeId, categoryId, contestId } = event.payload;
    try {
        logger.debug('Score submission tracked', { judgeId, categoryId, contestId });
    }
    catch (error) {
        logger.error('Failed to track score submission', { error });
    }
}
async function trackEventCreation(event) {
    const { eventId, createdBy } = event.payload;
    try {
        logger.debug('Event creation tracked', { eventId, createdBy });
    }
    catch (error) {
        logger.error('Failed to track event creation', { error });
    }
}
async function trackContestCertification(event) {
    const { contestId, certifiedBy, timeToComplete } = event.payload;
    try {
        logger.debug('Contest certification tracked', { contestId, certifiedBy, timeToComplete });
    }
    catch (error) {
        logger.error('Failed to track contest certification', { error });
    }
}
//# sourceMappingURL=StatisticsHandler.js.map