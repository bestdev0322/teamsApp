export enum SocketEvent {
  AGREEMENT_UPDATE = 'performance_agreement',
  ASSESSMENT_UPDATE = 'performance_assessment',
  NOTIFICATION = 'notification'
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