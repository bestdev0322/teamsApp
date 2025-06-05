import { Schema, model, Document } from 'mongoose';

export interface RiskCategoryDocument extends Document {
    _id: string;
    categoryName: string;
    description: string;
    tenantId: string;
}

const riskCategorySchema = new Schema<RiskCategoryDocument>({
    categoryName: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    tenantId: {
        type: String,
        required: true,
    }
}, {
    timestamps: true,
});

export default model<RiskCategoryDocument>('RiskCategory', riskCategorySchema);
