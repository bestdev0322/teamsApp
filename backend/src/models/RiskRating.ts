import { Schema, model, Document } from 'mongoose';

export interface RiskRatingDocument extends Document {
    _id: string;
    rating: string;
    minScore: number;
    maxScore: number;
    color: string;
    tenantId: string;
}

const riskRatingSchema = new Schema<RiskRatingDocument>({
    rating: {
        type: String,
        required: true
    },
    minScore: {
        type: Number,
        required: true
    },
    maxScore: {
        type: Number,
        required: true
    },
    color:{
        type: String,
        required: true
    },
    tenantId: {
        type: String,
        required: true
    },
}, {
    timestamps: true,
});

export default model<RiskRatingDocument>('RiskRating', riskRatingSchema);
