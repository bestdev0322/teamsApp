import { Schema, model, Document } from 'mongoose';

export interface ObligationDocument extends Document {
  complianceObligation: string;
  complianceArea: Schema.Types.ObjectId; // area _id
  frequency: string;
  lastDueDate: string;
  owner: Schema.Types.ObjectId; // team _id
  riskLevel: string;
  status: string;
  tenantId: string;
  complianceStatus: 'Completed' | 'Not Completed';
  comments: string;
  attachments: {
    filename: string;
    filepath: string;
  }[];
}

const obligationSchema = new Schema<ObligationDocument>({
  complianceObligation: { type: String, required: true },
  complianceArea: { type: Schema.Types.ObjectId, ref: 'ComplianceArea', required: true },
  frequency: { type: String, required: true },
  lastDueDate: { type: String, required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  riskLevel: { type: String, required: true },
  status: { type: String, required: true, default: 'Active' },
  tenantId: { type: String, required: true },
  complianceStatus: { type: String, required: true, enum: ['Completed', 'Not Completed'], default: 'Not Completed' },
  comments: { type: String, required: false, default: '' },
  attachments: {
    type: [{
      filename: String,
      filepath: String
    }],
    default: []
  }
}, {
  timestamps: true,
});

export default model<ObligationDocument>('Obligation', obligationSchema); 