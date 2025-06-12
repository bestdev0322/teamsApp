export enum SocketEvent {
  AGREEMENT_UPDATE = 'performance_agreement',
  ASSESSMENT_UPDATE = 'performance_assessment',
  NOTIFICATION = 'notification',
  OBLIGATION_SUBMITTED = 'obligation_submitted',
  RISK_TREATMENT_UPDATED = 'risk_treatment_updated',
  RISK_VALIDATED = 'risk_validated'
}

export interface SocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface SocketResponse {
  success: boolean;
  message?: string;
  data?: any;
} 