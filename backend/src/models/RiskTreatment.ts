import mongoose, { Document, Schema } from 'mongoose';

export interface IRiskTreatment extends Document {
  risk: mongoose.Types.ObjectId; // Reference to the Risk being treated
  treatment: string;
  treatmentOwner: mongoose.Types.ObjectId; // Reference to the Team (owner)
  targetDate: Date;
  status: 'Planned' | 'In Progress' | 'Completed';
  progressNotes: string;
  tenantId: string;
}

const RiskTreatmentSchema: Schema = new Schema({
  risk: {
    type: Schema.Types.ObjectId,
    ref: 'Risk',
    required: true,
  },
  treatment: {
    type: String,
    required: true,
  },
  treatmentOwner: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  targetDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['Planned', 'In Progress', 'Completed'],
    default: 'Planned',
  },
  progressNotes: {
    type: String,
    default: '',
  },
  tenantId: {
    type: String,
    required: true
  },
}, { timestamps: true });

export default mongoose.model<IRiskTreatment>('RiskTreatment', RiskTreatmentSchema); 