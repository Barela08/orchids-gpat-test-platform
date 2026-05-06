import { Router } from 'express';
import { connectDB } from '../../lib/mongodb.js';
import { Question } from '../../models/Question.js';
import { TestResult } from '../../models/TestResult.js';

const router = Router();

router.get('/results', async (req, res) => {
  try {
    await connectDB();
    const userId = req.query.userId as string | undefined;
    if (userId) {
      const results = await TestResult.find({ userId }).sort({ completedAt: -1 });
      return res.json(results);
    }
    const results = await TestResult.find().sort({ completedAt: -1 });
    return res.json(results);
  } catch (error) {
    req.log.error({ error }, 'Get results error');
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/results/:id', async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    const result = await TestResult.findById(id);
    if (!result) return res.status(404).json({ error: 'Result not found' });

    const questions = await Question.find({ year: result.year }).sort({ questionNumber: 1 });
    return res.json({ result, questions });
  } catch (error) {
    req.log.error({ error }, 'Get result error');
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/submit', async (req, res) => {
  try {
    await connectDB();
    const { userId, userName, year, answers, startedAt, timeTaken } = req.body;

    const questions = await Question.find({ year }).sort({ questionNumber: 1 });

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
      year,
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
