export enum SocketEvent {
  PERFORMANCE_AGREEMENT_UPDATE = 'performance_agreement_update',
  PERFORMANCE_ASSESSMENT_UPDATE = 'performance_assessment_update',
  APPROVE_PERFORMANCE_AGREEMENT = 'approve_performance_agreement',
  APPROVE_PERFORMANCE_ASSESSMENT = 'approve_performance_assessment',
  SEND_BACK_PERFORMANCE_AGREEMENT = 'send_back_performance_agreement',
  SEND_BACK_PERFORMANCE_ASSESSMENT = 'send_back_performance_assessment',
  NOTIFICATION = 'notification',
  OBLIGATION_SUBMITTED = 'obligation_submitted'
}

export interface SocketData {
  recipientId: string;
  status: string;
  timestamp?: string;
} 