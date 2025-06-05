import { Schema, model, Document } from 'mongoose';

export interface LikelihoodSettingDocument extends Document {
    _id: string;
    likelihoodName: string;
    description: string;
    score: number;
    tenantId: string;
}

const likelihoodSettingSchema = new Schema<LikelihoodSettingDocument>({
    likelihoodName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    tenantId: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        required: true
    }
}, {
    timestamps: true,
});

export default model<LikelihoodSettingDocument>('LikelihoodSetting', likelihoodSettingSchema);
