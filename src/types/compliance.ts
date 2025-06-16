export interface Attachment {
    filename: string;
    filepath: string;
}

export enum AssessmentStatus {
    Draft = 'Draft',
    Submitted = 'Submitted',
    Approved = 'Approved'
}

export interface UpdateEntry {
    year: string;
    quarter: string;
    complianceStatus?: 'Compliant' | 'Not Compliant';
    comments?: string;
    attachments?: Attachment[];
    assessmentStatus?: AssessmentStatus;
}

export interface Obligation {
    _id: string;
    complianceObligation: string;
    complianceArea: { areaName: string; };
    frequency: string;
    lastDueDate: string;
    owner: { name: string; };
    riskLevel: string;
    status: string;
    tenantId: string;
    update?: UpdateEntry[];
} 