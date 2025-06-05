import { Schema, model, Document } from 'mongoose';

export interface RiskImpactDocument extends Document {
    _id: string;
    impactName: string;
    description: string;
    score: number;
    tenantId: string;
}

const riskImpactSchema = new Schema<RiskImpactDocument>({
    impactName: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    score: {
        type: Number,
        required: true,
    },
    tenantId: {
        type: String,
        required: true,
    }
}, {
    timestamps: true,
});

export default model<RiskImpactDocument>('RiskImpact', riskImpactSchema);
