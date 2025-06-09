import { Schema, model, Document, Types } from 'mongoose';

export interface RiskDocument extends Document {
    _id: string;
    riskNameElement: string;
    strategicObjective: string;
    riskCategory: Types.ObjectId;
    riskDescription: string;
    cause: string;
    effectImpact: string;
    riskOwner: Types.ObjectId;
    status: 'Active' | 'Inactive';
    tenantId: string;
}

const riskSchema = new Schema<RiskDocument>({
    riskNameElement: {
        type: String,
        required: true,
    },
    strategicObjective: {
        type: String,
        required: true,
    },
    riskCategory: {
        type: Schema.Types.ObjectId,
        ref: 'RiskCategory',
        required: true,
    },
    riskDescription: {
        type: String,
        required: true,
    },
    cause: {
        type: String,
        required: true,
    },
    effectImpact: {
        type: String,
        required: true,
    },
    riskOwner: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        required: true,
    },
    tenantId: {
        type: String,
        required: true,
    }
}, {
    timestamps: true,
});

export default model<RiskDocument>('Risk', riskSchema); 