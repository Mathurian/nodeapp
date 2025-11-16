import { AppEvent } from './EventBusService';
export interface WebhookConfig {
    id: string;
    name: string;
    url: string;
    events: string[];
    enabled: boolean;
    secret?: string;
    headers?: Record<string, string>;
    retryAttempts: number;
    timeout: number;
}
export interface WebhookDeliveryResult {
    success: boolean;
    deliveryId: string;
    attemptCount: number;
    responseStatus?: number;
    responseBody?: string;
    error?: string;
}
export declare class WebhookDeliveryService {
    static deliver(webhook: WebhookConfig, event: AppEvent): Promise<WebhookDeliveryResult>;
    private static deliverWithRetry;
    private static sendWebhook;
    private static calculateSignature;
    private static sleep;
    static getDeliveryHistory(webhookId: string, limit?: number): Promise<any[]>;
    static getWebhookStats(webhookId: string, days?: number): Promise<any>;
    static retryDelivery(deliveryId: string): Promise<WebhookDeliveryResult>;
    static verifySignature(payload: any, signature: string, secret: string): boolean;
}
export default WebhookDeliveryService;
//# sourceMappingURL=WebhookDeliveryService.d.ts.map