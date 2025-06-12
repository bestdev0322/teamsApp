import { Schema, model, Document, Types } from 'mongoose';

interface ResidualScore {
    score: number;
    year: string;
    quarter: string;
}

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
    impact?: Types.ObjectId;
    likelihood?: Types.ObjectId;
    riskResponse?: Types.ObjectId;
    residualScores: ResidualScore[];
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
    },
    impact: {
        type: Schema.Types.ObjectId,
        ref: 'RiskImpact',
        required: false,
    },
    likelihood: {
        type: Schema.Types.ObjectId,
        ref: 'LikelihoodSetting',
        required: false,
    },
    riskResponse: {
        type: Schema.Types.ObjectId,
        ref: 'ImpactResponse',
        required: false,
    },
    residualScores: {
        type: [{
            score: {
                type: Number,
                required: true
            },
            year: {
                type: String,
                required: true,
            },
            quarter: {
                type: String,
                required: true,
            }
        }],
        default: []
    }
}, {
    timestamps: true,
});

export default model<RiskDocument>('Risk', riskSchema); 