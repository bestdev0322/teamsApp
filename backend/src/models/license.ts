import mongoose from 'mongoose';
import { License, LicenseStatus } from '../types';

const licenseSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true  // Only one license per company
  },
  licenseKey: {
    type: String,
    default: '',
    trim: true
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'expired'] as LicenseStatus[],
    default: 'inactive'
  }
}, {
  timestamps: true
});

const LicenseModel = mongoose.model<License & mongoose.Document>('License', licenseSchema);

export default LicenseModel; 