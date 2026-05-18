import mongoose, { Schema, Document } from 'mongoose';

export interface IContentCategory extends Document {
  name: string;
  description: string;
  subject: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContentCategorySchema = new Schema<IContentCategory>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    subject: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

ContentCategorySchema.index({ subject: 1, name: 1 }, { unique: true });

export const ContentCategory =
  mongoose.models.ContentCategory ||
  mongoose.model<IContentCategory>('ContentCategory', ContentCategorySchema);
