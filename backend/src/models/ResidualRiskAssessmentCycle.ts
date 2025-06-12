import mongoose, { Schema, Document } from 'mongoose';

export interface IQuarter {
  quarter: string; // Q1, Q2, Q3, Q4
  start: Date;
  end: Date;
}

export interface IResidualRiskAssessmentCycle extends Document {
  year: number;
  quarters: IQuarter[];
  createdAt: Date;
}

const QuarterSchema: Schema = new Schema({
  quarter: { type: String, required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
});

const ResidualRiskAssessmentCycleSchema: Schema = new Schema({
  year: { type: Number, required: true, unique: true },
  quarters: { type: [QuarterSchema], required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IResidualRiskAssessmentCycle>('ResidualRiskAssessmentCycle', ResidualRiskAssessmentCycleSchema); 