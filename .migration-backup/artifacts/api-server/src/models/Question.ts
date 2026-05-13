import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  questionNumber: number;
  questionText: string;
  options: { a: string; b: string; c: string; d: string };
  correctAnswer: 'a' | 'b' | 'c' | 'd';
  subject: string;
  chapter: string;
  year?: string;
  createdAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  questionNumber: { type: Number, required: true },
  questionText: { type: String, required: true },
  options: {
    a: { type: String, required: true },
    b: { type: String, required: true },
    c: { type: String, required: true },
    d: { type: String, required: true }
  },
  correctAnswer: { type: String, enum: ['a', 'b', 'c', 'd'], required: true },
  subject: { type: String, required: true },
  chapter: { type: String, required: true, default: 'General' },
  year: { type: String },
  createdAt: { type: Date, default: Date.now }
});

QuestionSchema.index({ subject: 1, chapter: 1, questionNumber: 1 });
QuestionSchema.index({ year: 1, questionNumber: 1 });

export const Question = mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);
