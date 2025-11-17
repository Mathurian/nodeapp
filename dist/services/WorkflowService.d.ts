export interface WorkflowTemplateInput {
    tenantId?: string;
    name: string;
    description?: string;
    type?: string;
    isDefault?: boolean;
    isActive?: boolean;
    steps: WorkflowStepInput[];
}
export interface WorkflowStepInput {
    name: string;
    description?: string;
    stepOrder: number;
    requiredRole?: string;
    autoAdvance?: boolean;
    requireApproval?: boolean;
    conditions?: any;
    actions?: any;
    notifyRoles?: string[];
}
export declare class WorkflowService {
    static createTemplate(input: WorkflowTemplateInput): Promise<any>;
    static getTemplate(id: string): Promise<any>;
    static listTemplates(tenantId?: string, type?: string): Promise<any[]>;
    static startWorkflow(workflowId: string, tenantId: string, entityType: string, entityId: string): Promise<any>;
    static advanceWorkflow(instanceId: string, _userId: string, approvalStatus: 'approved' | 'rejected', _comments?: string): Promise<any>;
    static getInstance(id: string): Promise<any>;
    static listInstancesForEntity(tenantId: string, entityType: string, entityId: string): Promise<any[]>;
}
export default WorkflowService;
//# sourceMappingURL=WorkflowService.d.ts.map