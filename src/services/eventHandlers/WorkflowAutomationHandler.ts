import { AppEvent, EventHandler } from '../EventBusService';
import { createLogger } from '../../utils/logger';
import { WorkflowService } from '../WorkflowService';

const logger = createLogger('WorkflowAutomationHandler');

export const WorkflowAutomationHandler: { handler: EventHandler } = {
  handler: async (event: AppEvent) => {
    const tenantId = event.metadata.tenantId;
    if (!tenantId) return;

    const payload = (event.payload && typeof event.payload === 'object')
      ? (event.payload as Record<string, unknown>)
      : {};

    const started = await WorkflowService.autoStartForEvent(event.type, tenantId, payload);
    if (started > 0) {
      logger.info('Auto-started workflow templates', {
        eventType: event.type,
        tenantId,
        started,
      });
    }
  },
};

