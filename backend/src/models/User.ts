import mongoose from 'mongoose';
import { UserRole, dUser } from '../types/user';

const userSchema = new mongoose.Schema<dUser>({
  MicrosoftId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    required: true
  },
  tenantId: {
    type: String,
    required: false,
  },
  teamId: {
    type: String,
    required: false,
    ref: 'Team'
  },
  jobTitle: {
    type: String,
    required: false,
  },
  isDevMember: {
    type: Boolean,
    default: false
  },
  isPerformanceCalibrationMember: {
    type: Boolean,
    default: false
  },
  isComplianceSuperUser: {
    type: Boolean,
    default: false
  },
  isComplianceChampion: {
    type: Boolean,
    default: false
  },
  isRiskSuperUser: {
    type: Boolean,
    default: false
  },
  isRiskChampion: {
    type: Boolean,
    default: false
  }
});

export default mongoose.model<dUser>('User', userSchema); 
