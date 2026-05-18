import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChapterView {
  chapterId: Types.ObjectId;
  chapterName: string;
  subject: string;
  timeSpent: number;
  viewedAt: Date;
}

export interface IUserActivity extends Document {
  userId: Types.ObjectId;
  userName: string;
  sessionStart: Date;
  sessionEnd: Date | null;
  totalTime: number;
  lastActive: Date;
  chapterViews: IChapterView[];
}

const ChapterViewSchema = new Schema<IChapterView>(
  {
    chapterId: { type: Schema.Types.ObjectId, ref: 'ContentChapter' },
    chapterName: { type: String },
    subject: { type: String },
    timeSpent: { type: Number, default: 0 },
    viewedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserActivitySchema = new Schema<IUserActivity>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    sessionStart: { type: Date, default: Date.now },
    sessionEnd: { type: Date, default: null },
    totalTime: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now },
    chapterViews: { type: [ChapterViewSchema], default: [] },
  },
  { timestamps: true }
);

UserActivitySchema.index({ userId: 1 });
UserActivitySchema.index({ lastActive: -1 });

export const UserActivity =
  mongoose.models.UserActivity ||
  mongoose.model<IUserActivity>('UserActivity', UserActivitySchema);
