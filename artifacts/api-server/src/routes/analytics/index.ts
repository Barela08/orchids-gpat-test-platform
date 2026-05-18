import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../lib/auth-middleware.js';
import { connectDB } from '../../lib/mongodb.js';
import { User } from '../../models/User.js';
import { Question } from '../../models/Question.js';
import { ContentCategory } from '../../models/ContentCategory.js';
import { ContentChapter } from '../../models/ContentChapter.js';
import { UserActivity } from '../../models/UserActivity.js';
import { TestResult } from '../../models/TestResult.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  await connectDB();

  const [
    totalUsers,
    totalQuestions,
    totalCategories,
    totalChapters,
    subjectCount,
    activeUsersData,
    mostViewedChapter,
    totalTestsData,
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Question.countDocuments(),
    ContentCategory.countDocuments(),
    ContentChapter.countDocuments(),
    Question.distinct('subject'),
    UserActivity.aggregate([
      {
        $match: {
          lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      },
      { $group: { _id: '$userId' } },
      { $count: 'count' },
    ]),
    UserActivity.aggregate([
      { $unwind: '$chapterViews' },
      {
        $group: {
          _id: '$chapterViews.chapterId',
          chapterName: { $first: '$chapterViews.chapterName' },
          subject: { $first: '$chapterViews.subject' },
          totalViews: { $sum: 1 },
          totalTimeSpent: { $sum: '$chapterViews.timeSpent' },
        },
      },
      { $sort: { totalViews: -1 } },
      { $limit: 5 },
    ]),
    UserActivity.aggregate([
      { $group: { _id: null, totalTime: { $sum: '$totalTime' } } },
    ]),
  ]);

  return res.json({
    totalUsers,
    totalQuestions,
    totalSubjects: subjectCount.length,
    totalCategories,
    totalChapters,
    activeUsersToday: activeUsersData[0]?.count || 0,
    mostViewedChapters: mostViewedChapter,
    totalWatchTime: totalTestsData[0]?.totalTime || 0,
  });
});

// GET /api/analytics/chapter-views — most viewed content chapters
router.get('/chapter-views', requireAuth, requireAdmin, async (_req, res) => {
  await connectDB();
  const data = await UserActivity.aggregate([
    { $unwind: '$chapterViews' },
    {
      $group: {
        _id: '$chapterViews.chapterId',
        chapterName: { $first: '$chapterViews.chapterName' },
        subject: { $first: '$chapterViews.subject' },
        totalViews: { $sum: 1 },
        totalTimeSpent: { $sum: '$chapterViews.timeSpent' },
      },
    },
    { $sort: { totalViews: -1 } },
    { $limit: 10 },
  ]);
  return res.json(data);
});

// GET /api/analytics/test-stats
router.get('/test-stats', requireAuth, requireAdmin, async (_req, res) => {
  await connectDB();
  const [total, bySubject] = await Promise.all([
    TestResult.countDocuments(),
    TestResult.aggregate([
      { $match: { subject: { $exists: true, $ne: null } } },
      { $group: { _id: '$subject', count: { $sum: 1 }, avgScore: { $avg: '$percentage' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);
  return res.json({ total, bySubject });
});

export default router;
