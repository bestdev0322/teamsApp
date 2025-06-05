export * from './annualCorporateScorecard';
export * from './page';
export * from './personalPerformance';
export * from './notification';
export * from './pdf'
export * from './course';
export * from './feedback';

export type BaseEntity = {
  _id: string;
  __v?: number;
};

export type Status = 'active' | 'inactive';
export type LicenseStatus = 'active' | 'pending' | 'expired';
export type LicenseType = 'Basic' | 'Professional' | 'Enterprise';

export interface Company extends BaseEntity {
  name: string;
  status: Status;
  createdOn: string;
  tenantId: string;
}

export interface SuperUser extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  companyId: string;
  status: Status;
}

export interface License extends BaseEntity {
  companyId: string;
  licenseKey: string;
  startDate: string;
  endDate: string;
  status: LicenseStatus;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface UserProfile {
  _id?: string;
  id: string;
  email: string;
  displayName: string;
  jobTitle?: string;
  department?: string;
  organization?: string;
  role: string;
  status: 'active' | 'inactive';
  tenantId: string;
  organizationName?: string;
  isDevMember: boolean;
  isPerformanceCalibrationMember: boolean;
  isTeamOwner: boolean;
  teamId?: string;
  isComplianceSuperUser?: boolean;
  isComplianceChampion?: boolean;
  isRiskSuperUser?: boolean;
  isRiskChampion?: boolean;
} 

