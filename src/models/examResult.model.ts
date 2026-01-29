import { Schema, model, Document, Types } from 'mongoose';

export type ExamMode = 'PURE_JAMB' | 'JAMB_AI' | 'SINGLE_SUBJECT';

export interface ISubjectResult {
    subject: string;
    score: number;
    total: number; // 100 for JAMB modes, varies for single subject
}

export interface IExamAnswer {
    questionId: string;
    selectedOption: string;
    correctOption: string; // Storing this for easier checking later if needed
    isCorrect: boolean;
}

export interface IExamResult extends Document {
    userId: Types.ObjectId;
    mode: ExamMode;
    score: number;
    totalObtainable: number; // 400 or 60/80
    isPassed: boolean;
    subjects: ISubjectResult[];
    answers: IExamAnswer[];
    startTime: Date;
    endTime: Date;
    durationSeconds: number;
    feedback?: string;
    createdAt: Date;
    updatedAt: Date;
}

const subjectResultSchema = new Schema<ISubjectResult>({
    subject: { type: String, required: true },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
}, { _id: false });

const examAnswerSchema = new Schema<IExamAnswer>({
    questionId: { type: String, required: true },
    selectedOption: { type: String, required: true },
    correctOption: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
}, { _id: false });

const examResultSchema = new Schema<IExamResult>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mode: {
        type: String,
        enum: ['PURE_JAMB', 'JAMB_AI', 'SINGLE_SUBJECT'],
        required: true,
        index: true
    },
    score: { type: Number, required: true },
    totalObtainable: { type: Number, required: true },
    isPassed: { type: Boolean, required: true, index: true },
    subjects: [subjectResultSchema],
    answers: [examAnswerSchema], // Storing basic answer info
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationSeconds: { type: Number, required: true },
    feedback: { type: String }, // Generated feedback
}, {
    timestamps: true,
});

// Index for specific queries: User's history filtered by mode
examResultSchema.index({ userId: 1, mode: 1, createdAt: -1 });

export const ExamResult = model<IExamResult>('ExamResult', examResultSchema);
