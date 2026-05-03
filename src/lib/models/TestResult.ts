import mongoose, { Schema, Document } from 'mongoose';

export interface ITestResult extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  subject: string;
  chapter: string;
  year: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  percentage: number;
  timeTaken: number;
  answers: {
    questionId: mongoose.Types.ObjectId;
    questionNumber: number;
    selectedAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
  startedAt: Date;
  completedAt: Date;
}

const TestResultSchema = new Schema<ITestResult>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  subject: { type: String, default: 'All' },
  chapter: { type: String, default: 'General' },
  year: { type: String, required: true },
  totalQuestions: { type: Number, required: true },
  correctAnswers: { type: Number, required: true },
  wrongAnswers: { type: Number, required: true },
  unanswered: { type: Number, required: true },
  percentage: { type: Number, required: true },
  timeTaken: { type: Number, required: true },
  answers: [{
    questionId: { type: Schema.Types.ObjectId, ref: 'Question' },
    questionNumber: Number,
    selectedAnswer: String,
    correctAnswer: String,
    isCorrect: Boolean
  }],
  startedAt: { type: Date, required: true },
  completedAt: { type: Date, default: Date.now }
});

export const TestResult = mongoose.models.TestResult || mongoose.model<ITestResult>('TestResult', TestResultSchema);
