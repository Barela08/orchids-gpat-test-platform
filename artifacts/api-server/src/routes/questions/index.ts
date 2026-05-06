import { Router } from 'express';
import { connectDB } from '../../lib/mongodb.js';
import { Question } from '../../models/Question.js';
import { requireAuth, requireAdmin } from '../../lib/auth-middleware.js';

const router = Router();

router.get('/years', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const years = await Question.distinct('year');
    const validYears = years.filter(Boolean);
    const yearsWithCount = await Promise.all(
      validYears.map(async (year) => {
        const count = await Question.countDocuments({ year });
        return { year, count };
      })
    );
    yearsWithCount.sort((a, b) => b.year.localeCompare(a.year));
    return res.json(yearsWithCount);
  } catch (error) {
    req.log.error({ error }, 'Get years error');
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/subjects', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const subjects = await Question.distinct('subject');
    const subjectsWithCount = await Promise.all(
      subjects.map(async (subject) => {
        const chapters = await Question.distinct('chapter', { subject });
        const count = await Question.countDocuments({ subject });
        return { subject, chapterCount: chapters.length, questionCount: count };
      })
    );
    subjectsWithCount.sort((a, b) => a.subject.localeCompare(b.subject));
    return res.json(subjectsWithCount);
  } catch (error) {
    req.log.error({ error }, 'Get subjects error');
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/chapters', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const subject = req.query.subject as string | undefined;
    const filter = subject ? { subject } : {};
    const chapters = await Question.distinct('chapter', filter);
    const chaptersWithCount = await Promise.all(
      chapters.map(async (chapter) => {
        const count = await Question.countDocuments({ ...(subject ? { subject } : {}), chapter });
        return { chapter, count };
      })
    );
    chaptersWithCount.sort((a, b) => a.chapter.localeCompare(b.chapter));
    return res.json(chaptersWithCount);
  } catch (error) {
    req.log.error({ error }, 'Get chapters error');
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const { year, subject, chapter } = req.query as Record<string, string | undefined>;
    const filter: Record<string, string> = {};
    if (year) filter.year = year;
    if (subject) filter.subject = subject;
    if (chapter) filter.chapter = chapter;
    const questions = await Question.find(filter).sort({ questionNumber: 1 });
    return res.json(questions);
  } catch (error) {
    req.log.error({ error }, 'Get questions error');
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    await connectDB();
    const data = req.body;
    if (Array.isArray(data)) {
      const results = [];
      for (const q of data) {
        const filter: Record<string, unknown> = {};
        if (q.year) {
          filter.year = q.year;
          filter.questionNumber = q.questionNumber;
        } else {
          filter.subject = q.subject;
          filter.chapter = q.chapter;
          filter.questionNumber = q.questionNumber;
        }
        const existing = await Question.findOne(filter);
        if (existing) {
          await Question.updateOne(filter, q);
        } else {
          await Question.create(q);
        }
        results.push(q);
      }
      return res.json({ message: `${results.length} questions uploaded`, count: results.length });
    }
    const question = await Question.create(data);
    return res.json(question);
  } catch (error) {
    req.log.error({ error }, 'Create question error');
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    await connectDB();
    const { year, subject, chapter } = req.query as Record<string, string | undefined>;
    const filter: Record<string, string> = {};
    if (year) filter.year = year;
    if (subject) filter.subject = subject;
    if (chapter) filter.chapter = chapter;
    if (Object.keys(filter).length === 0) {
      return res.status(400).json({ error: 'At least one filter (year, subject, or chapter) is required' });
    }
    const result = await Question.deleteMany(filter);
    return res.json({ message: `Deleted ${result.deletedCount} questions`, count: result.deletedCount });
  } catch (error) {
    req.log.error({ error }, 'Delete questions error');
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
