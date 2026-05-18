import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../lib/auth-middleware.js';
import { connectDB } from '../../lib/mongodb.js';
import { UserActivity } from '../../models/UserActivity.js';
import { Types } from 'mongoose';

const router = Router();

// POST /api/activity/ping — called by frontend periodically to update session
router.post('/ping', requireAuth, async (req, res) => {
  await connectDB();
  const { sessionId, timeSpent, chapterView } = req.body;
  const userId = new Types.ObjectId(req.user!.userId);

  let activity = sessionId
    ? await UserActivity.findById(sessionId)
    : null;

  if (!activity) {
    activity = await UserActivity.create({
      userId,
      userName: req.user!.name,
      sessionStart: new Date(),
      lastActive: new Date(),
      totalTime: 0,
      chapterViews: [],
    });
    return res.json({ sessionId: activity._id });
  }

  activity.lastActive = new Date();
  if (typeof timeSpent === 'number' && timeSpent > 0) {
    activity.totalTime += timeSpent;
  }

  if (chapterView && chapterView.chapterId) {
    const existing = activity.chapterViews.find(
      (v) => v.chapterId?.toString() === chapterView.chapterId
    );
    if (existing) {
      existing.timeSpent += chapterView.timeSpent || 0;
    } else {
      activity.chapterViews.push({
        chapterId: new Types.ObjectId(chapterView.chapterId),
        chapterName: chapterView.chapterName || '',
        subject: chapterView.subject || '',
        timeSpent: chapterView.timeSpent || 0,
        viewedAt: new Date(),
      });
    }
  }

  await activity.save();
  return res.json({ sessionId: activity._id });
});

// POST /api/activity/end — called when user logs out / tab closes
router.post('/end', requireAuth, async (req, res) => {
  await connectDB();
  const { sessionId, timeSpent } = req.body;
  if (!sessionId) return res.json({ ok: true });

  await UserActivity.findByIdAndUpdate(sessionId, {
    sessionEnd: new Date(),
    lastActive: new Date(),
    $inc: { totalTime: typeof timeSpent === 'number' ? timeSpent : 0 },
  });
  return res.json({ ok: true });
});

// GET /api/activity/stats — admin only, returns per-user activity summary
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  await connectDB();

  const stats = await UserActivity.aggregate([
    {
      $group: {
        _id: '$userId',
        userName: { $last: '$userName' },
        totalTime: { $sum: '$totalTime' },
        lastActive: { $max: '$lastActive' },
        sessionCount: { $sum: 1 },
        chapterViewsCount: { $sum: { $size: '$chapterViews' } },
      },
    },
    { $sort: { lastActive: -1 } },
  ]);

  return res.json(stats);
});

// GET /api/activity/user/:userId — admin: full activity for one user
router.get('/user/:userId', requireAuth, requireAdmin, async (req, res) => {
  await connectDB();
  const sessions = await UserActivity.find({ userId: req.params.userId })
    .sort({ sessionStart: -1 })
    .limit(20);
  return res.json(sessions);
});

export default router;
