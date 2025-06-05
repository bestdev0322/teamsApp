import { Schema, model, Document } from 'mongoose';

export interface ControlEffectivenessDocument extends Document {
    _id: string;
    controlEffectiveness: string;
    description: string;
    factor: number;
    tenantId: string;
}

const controlEffectivenessSchema = new Schema<ControlEffectivenessDocument>({
    controlEffectiveness: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    factor: {
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

export default model<ControlEffectivenessDocument>('ControlEffectiveness', controlEffectivenessSchema);
