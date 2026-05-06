import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Question } from '@/lib/models/Question';

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');

    if (year) {
      const questions = await Question.find({ year }).sort({ questionNumber: 1 });
      return NextResponse.json(questions);
    }

    const questions = await Question.find().sort({ year: -1, questionNumber: 1 });
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Get questions error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const data = await req.json();

    if (Array.isArray(data)) {
      const results = [];
      for (const q of data) {
        const existing = await Question.findOne({ year: q.year, questionNumber: q.questionNumber });
        if (existing) {
          await Question.updateOne(
            { year: q.year, questionNumber: q.questionNumber },
            q
          );
        } else {
          await Question.create(q);
        }
        results.push(q);
      }
      return NextResponse.json({ message: `${results.length} questions uploaded`, count: results.length });
    }

    const question = await Question.create(data);
    return NextResponse.json(question);
  } catch (error) {
    console.error('Create question error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');

    if (year) {
      const result = await Question.deleteMany({ year });
      return NextResponse.json({ message: `Deleted ${result.deletedCount} questions from ${year}`, count: result.deletedCount });
    }

    return NextResponse.json({ error: 'Year parameter required' }, { status: 400 });
  } catch (error) {
    console.error('Delete questions error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
