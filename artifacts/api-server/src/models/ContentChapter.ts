import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IContentChapter extends Document {
  name: string;
  description: string;
  subject: string;
  categoryId: Types.ObjectId;
  pdfUrl: string | null;
  pdfOriginalName: string | null;
  videoUrl: string | null;
  videoLink: string | null;
  thumbnailUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ContentChapterSchema = new Schema<IContentChapter>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    subject: { type: String, required: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'ContentCategory', required: true },
    pdfUrl: { type: String, default: null },
    pdfOriginalName: { type: String, default: null },
    videoUrl: { type: String, default: null },
    videoLink: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
  },
  { timestamps: true }
);

ContentChapterSchema.index({ categoryId: 1, name: 1 }, { unique: true });
ContentChapterSchema.index({ subject: 1 });

export const ContentChapter =
  mongoose.models.ContentChapter ||
  mongoose.model<IContentChapter>('ContentChapter', ContentChapterSchema);
