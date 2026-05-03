import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Question } from '@/lib/models/Question';
import { TestResult } from '@/lib/models/TestResult';

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year') || body.year;
    const subject = searchParams.get('subject') || body.subject || 'All';
    const chapter = searchParams.get('chapter') || body.chapter || 'General';
    const { userId, userName, answers, startedAt, timeTaken } = body;

    const filter: any = { year };
    if (subject !== 'All') filter.subject = subject;
    if (chapter !== 'General') filter.chapter = chapter;

    const questions = await Question.find(filter).sort({ questionNumber: 1 });

    let correctAnswers = 0;
    let wrongAnswers = 0;
    let unanswered = 0;

    const detailedAnswers = questions.map((q) => {
      const userAnswer = answers[q._id.toString()] || null;
      const isCorrect = userAnswer === q.correctAnswer;

      if (!userAnswer) {
        unanswered++;
      } else if (isCorrect) {
        correctAnswers++;
      } else {
        wrongAnswers++;
      }

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
      subject,
      chapter,
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

    return NextResponse.json({
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
    console.error('Submit test error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
