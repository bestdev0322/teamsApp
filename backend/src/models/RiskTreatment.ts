import mongoose, { Document, Schema } from 'mongoose';

interface ProgressHistoryEntry {
  progressNotes: string;
  updatedAt: Date;
}

export interface IRiskTreatment extends Document {
  risk: mongoose.Types.ObjectId; // Reference to the Risk being treated
  treatment: string;
  treatmentOwner: mongoose.Types.ObjectId; // Reference to the Team (owner)
  targetDate: Date;
  status: 'Planned' | 'In Progress' | 'Completed';
  tenantId: string;
  convertedToControl?: boolean; // New field for pending validation tab
  validationNotes?: string;     // New field for pending validation tab
  validationDate?: Date;        // New field for pending validation tab
  controlName?: string;         // New field for converted control
  controlType?: string;         // New field for converted control
  frequency?: string;          // New field for converted control
  progressHistory: ProgressHistoryEntry[];
  effectiveness: mongoose.Types.ObjectId; // Reference to the Effectiveness being treated
}

const ProgressHistorySchema = new Schema({
  progressNotes: {
    type: String,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

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
  tenantId: {
    type: String,
    required: true
  },
  convertedToControl: {
    type: Boolean,
    default: false,
  },
  validationNotes: {
    type: String,
    required: false,
  },
  validationDate: {
    type: Date,
    required: false,
  },
  controlName: {
    type: String,
    required: false,
  },
  controlType: {
    type: String,
    enum: ['Preventive', 'Detective', 'Corrective', 'Mitigating'],
    required: false,
  },
  frequency: {
    type: String,
    required: false,
  },
  progressHistory: {
    type: [ProgressHistorySchema],
    default: [],
  },
  effectiveness: [{
    effectiveness: {
      type: Schema.Types.ObjectId,
      ref: 'ControlEffectiveness',
      required: false,
    },
    year: {
      type: String,
      required: false
    },
    quarter: {
      type: String,
      required: false
    }
  }],
}, { timestamps: true });

export default mongoose.model<IRiskTreatment>('RiskTreatment', RiskTreatmentSchema); 