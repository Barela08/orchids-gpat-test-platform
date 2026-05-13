import { Router } from 'express';
import { connectDB } from '../../lib/mongodb.js';
import { Question } from '../../models/Question.js';
import { TestResult } from '../../models/TestResult.js';
import { requireAuth } from '../../lib/auth-middleware.js';

const router = Router();

router.get('/results', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const userId = req.query.userId as string | undefined;

    if (req.user!.role === 'admin') {
      const results = userId
        ? await TestResult.find({ userId }).sort({ completedAt: -1 })
        : await TestResult.find().sort({ completedAt: -1 });
      return res.json(results);
    }

    const results = await TestResult.find({ userId: req.user!.userId }).sort({ completedAt: -1 });
    return res.json(results);
  } catch (error) {
    req.log.error({ error }, 'Get results error');
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/results/:id', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    const result = await TestResult.findById(id);
    if (!result) return res.status(404).json({ error: 'Result not found' });

    if (req.user!.role !== 'admin' && result.userId.toString() !== req.user!.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json({ result });
  } catch (error) {
    req.log.error({ error }, 'Get result error');
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/submit', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const { year, subject, chapter, testType = 'year', answers, startedAt, timeTaken } = req.body;
    const userId = req.user!.userId;
    const userName = req.user!.name;

    const filter: Record<string, string> = {};
    if (testType === 'year' && year) filter.year = year;
    if (testType === 'subject' && subject) filter.subject = subject;
    if (testType === 'chapter') {
      if (subject) filter.subject = subject;
      if (chapter) filter.chapter = chapter;
    }

    let testLabel = '';
    if (testType === 'year') testLabel = year || '';
    else if (testType === 'subject') testLabel = subject || '';
    else testLabel = `${subject} › ${chapter}`;

    const questions = await Question.find(filter).sort({ questionNumber: 1 });

    let correctAnswers = 0;
    let wrongAnswers = 0;
    let unanswered = 0;

    const detailedAnswers = questions.map((q) => {
      const userAnswer = answers[q._id.toString()] || null;
      const isCorrect = userAnswer === q.correctAnswer;

      if (!userAnswer) unanswered++;
      else if (isCorrect) correctAnswers++;
      else wrongAnswers++;

      return {
        questionId: q._id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        options: q.options,
        subject: q.subject,
        chapter: q.chapter,
        selectedAnswer: userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect
      };
    });

    const totalQuestions = questions.length;
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    const testResult = await TestResult.create({
      userId,
      userName,
      testType,
      year: year || undefined,
      subject: subject || undefined,
      chapter: chapter || undefined,
      testLabel,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      unanswered,
      percentage,
      timeTaken,
      answers: detailedAnswers,
      startedAt: new Date(startedAt),
      completedAt: new Date()
    });

    return res.json({
      result: {
        id: testResult._id,
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        unanswered,
        percentage,
        timeTaken
      }
    });
  } catch (error) {
    req.log.error({ error }, 'Submit test error');
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
