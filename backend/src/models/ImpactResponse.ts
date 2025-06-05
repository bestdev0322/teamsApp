import { Schema, model, Document } from 'mongoose';

export interface ImpactResponseDocument extends Document {
    _id: string;
    responseName: string;
    description: string;
    tenantId: string;
}

const impactResponseSchema = new Schema<ImpactResponseDocument>({
    responseName: {
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

export default model<ImpactResponseDocument>('ImpactResponse', impactResponseSchema);
