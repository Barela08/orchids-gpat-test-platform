import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, requireAdmin } from '../../lib/auth-middleware.js';
import { connectDB } from '../../lib/mongodb.js';
import { ContentCategory } from '../../models/ContentCategory.js';
import { ContentChapter } from '../../models/ContentChapter.js';

const router = Router();

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed: Record<string, string[]> = {
    pdf: ['application/pdf'],
    video: ['video/mp4', 'video/webm', 'video/ogg', 'video/mpeg'],
    thumbnail: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  };
  const field = file.fieldname as keyof typeof allowed;
  if (allowed[field]?.includes(file.mimetype)) return cb(null, true);
  cb(new Error(`Invalid file type for ${file.fieldname}`));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 },
});

const chapterUpload = upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);

// ── Categories ────────────────────────────────────────────────────────────────

router.get('/categories', requireAuth, async (req, res) => {
  await connectDB();
  const { subject } = req.query;
  const filter = subject ? { subject: subject as string } : {};
  const categories = await ContentCategory.find(filter).sort({ subject: 1, name: 1 });
  res.json(categories);
});

router.post('/categories', requireAuth, requireAdmin, async (req, res) => {
  await connectDB();
  const { name, description, subject } = req.body;
  if (!name?.trim() || !subject?.trim()) {
    return res.status(400).json({ error: 'Name and subject are required' });
  }
  const exists = await ContentCategory.findOne({ name: name.trim(), subject: subject.trim() });
  if (exists) return res.status(409).json({ error: 'Category already exists for this subject' });
  const cat = await ContentCategory.create({ name: name.trim(), description: description?.trim() || '', subject: subject.trim() });
  return res.status(201).json(cat);
});

router.put('/categories/:id', requireAuth, requireAdmin, async (req, res) => {
  await connectDB();
  const { name, description, subject } = req.body;
  if (!name?.trim() || !subject?.trim()) {
    return res.status(400).json({ error: 'Name and subject are required' });
  }
  const conflict = await ContentCategory.findOne({ name: name.trim(), subject: subject.trim(), _id: { $ne: req.params.id } });
  if (conflict) return res.status(409).json({ error: 'Another category with this name already exists for this subject' });
  const cat = await ContentCategory.findByIdAndUpdate(
    req.params.id,
    { name: name.trim(), description: description?.trim() || '', subject: subject.trim() },
    { new: true }
  );
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  return res.json(cat);
});

router.delete('/categories/:id', requireAuth, requireAdmin, async (req, res) => {
  await connectDB();
  const cat = await ContentCategory.findByIdAndDelete(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  await ContentChapter.deleteMany({ categoryId: req.params.id });
  return res.json({ message: 'Category and its chapters deleted' });
});

// ── Chapters ──────────────────────────────────────────────────────────────────

router.get('/chapters', requireAuth, async (req, res) => {
  await connectDB();
  const { categoryId, subject } = req.query;
  const filter: Record<string, unknown> = {};
  if (categoryId) filter.categoryId = categoryId;
  if (subject) filter.subject = subject;
  const chapters = await ContentChapter.find(filter).populate('categoryId', 'name subject').sort({ createdAt: 1 });
  return res.json(chapters);
});

router.get('/chapters/:id', requireAuth, async (req, res) => {
  await connectDB();
  const chapter = await ContentChapter.findById(req.params.id).populate('categoryId', 'name subject');
  if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
  return res.json(chapter);
});

router.post('/chapters', requireAuth, requireAdmin, chapterUpload, async (req, res) => {
  await connectDB();
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const { name, description, subject, categoryId, videoLink } = req.body;

  if (!name?.trim()) return res.status(400).json({ error: 'Chapter name is required' });
  if (!subject?.trim()) return res.status(400).json({ error: 'Subject is required' });
  if (!categoryId) return res.status(400).json({ error: 'Category is required' });

  const category = await ContentCategory.findById(categoryId);
  if (!category) return res.status(404).json({ error: 'Category not found' });

  const duplicate = await ContentChapter.findOne({ name: name.trim(), categoryId });
  if (duplicate) return res.status(409).json({ error: 'A chapter with this name already exists in this category' });

  const pdfFile = files?.pdf?.[0];
  const videoFile = files?.video?.[0];
  const thumbFile = files?.thumbnail?.[0];

  const chapter = await ContentChapter.create({
    name: name.trim(),
    description: description?.trim() || '',
    subject: subject.trim(),
    categoryId,
    pdfUrl: pdfFile ? `/uploads/${pdfFile.filename}` : null,
    pdfOriginalName: pdfFile ? pdfFile.originalname : null,
    videoUrl: videoFile ? `/uploads/${videoFile.filename}` : null,
    videoLink: videoLink?.trim() || null,
    thumbnailUrl: thumbFile ? `/uploads/${thumbFile.filename}` : null,
  });

  return res.status(201).json(chapter);
});

router.put('/chapters/:id', requireAuth, requireAdmin, chapterUpload, async (req, res) => {
  await connectDB();
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const { name, description, subject, categoryId, videoLink } = req.body;

  if (!name?.trim()) return res.status(400).json({ error: 'Chapter name is required' });

  const chapter = await ContentChapter.findById(req.params.id);
  if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

  const targetCategory = categoryId || chapter.categoryId;
  const duplicate = await ContentChapter.findOne({ name: name.trim(), categoryId: targetCategory, _id: { $ne: req.params.id } });
  if (duplicate) return res.status(409).json({ error: 'Another chapter with this name exists in this category' });

  const pdfFile = files?.pdf?.[0];
  const videoFile = files?.video?.[0];
  const thumbFile = files?.thumbnail?.[0];

  if (pdfFile && chapter.pdfUrl) {
    const old = path.join(uploadsDir, path.basename(chapter.pdfUrl));
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }
  if (videoFile && chapter.videoUrl) {
    const old = path.join(uploadsDir, path.basename(chapter.videoUrl));
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }
  if (thumbFile && chapter.thumbnailUrl) {
    const old = path.join(uploadsDir, path.basename(chapter.thumbnailUrl));
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }

  const updated = await ContentChapter.findByIdAndUpdate(
    req.params.id,
    {
      name: name.trim(),
      description: description?.trim() ?? chapter.description,
      subject: subject?.trim() ?? chapter.subject,
      categoryId: targetCategory,
      ...(pdfFile ? { pdfUrl: `/uploads/${pdfFile.filename}`, pdfOriginalName: pdfFile.originalname } : {}),
      ...(videoFile ? { videoUrl: `/uploads/${videoFile.filename}` } : {}),
      ...(thumbFile ? { thumbnailUrl: `/uploads/${thumbFile.filename}` } : {}),
      videoLink: videoLink !== undefined ? videoLink.trim() || null : chapter.videoLink,
    },
    { new: true }
  );

  return res.json(updated);
});

router.delete('/chapters/:id', requireAuth, requireAdmin, async (req, res) => {
  await connectDB();
  const chapter = await ContentChapter.findByIdAndDelete(req.params.id);
  if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
  for (const url of [chapter.pdfUrl, chapter.videoUrl, chapter.thumbnailUrl]) {
    if (url) {
      const filePath = path.join(uploadsDir, path.basename(url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }
  return res.json({ message: 'Chapter deleted' });
});

export default router;
