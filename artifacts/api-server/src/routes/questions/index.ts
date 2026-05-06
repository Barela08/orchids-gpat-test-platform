import { Router } from 'express';
import { connectDB } from '../../lib/mongodb.js';
import { Question } from '../../models/Question.js';
import { requireAuth, requireAdmin } from '../../lib/auth-middleware.js';

const router = Router();

router.get('/years', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const years = await Question.distinct('year');
    const yearsWithCount = await Promise.all(
      years.map(async (year) => {
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

router.get('/', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const year = req.query.year as string | undefined;
    if (year) {
      const questions = await Question.find({ year }).sort({ questionNumber: 1 });
      return res.json(questions);
    }
    const questions = await Question.find().sort({ year: -1, questionNumber: 1 });
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
        const existing = await Question.findOne({ year: q.year, questionNumber: q.questionNumber });
        if (existing) {
          await Question.updateOne({ year: q.year, questionNumber: q.questionNumber }, q);
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
    const year = req.query.year as string | undefined;
    if (year) {
      const result = await Question.deleteMany({ year });
      return res.json({ message: `Deleted ${result.deletedCount} questions from ${year}`, count: result.deletedCount });
    }
    return res.status(400).json({ error: 'Year parameter required' });
  } catch (error) {
    req.log.error({ error }, 'Delete questions error');
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
