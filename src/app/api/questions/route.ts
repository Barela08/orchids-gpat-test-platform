import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Question } from '@/lib/models/Question';

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const subject = searchParams.get('subject');
    const chapter = searchParams.get('chapter');

    const filter: any = {};
    if (year) filter.year = year;
    if (subject) filter.subject = subject;
    if (chapter) filter.chapter = chapter;

    const questions = await Question.find(filter).sort({ questionNumber: 1 });
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
    const subject = searchParams.get('subject');
    const chapter = searchParams.get('chapter');

    const filter: any = {};
    if (year) filter.year = year;
    if (subject) filter.subject = subject;
    if (chapter) filter.chapter = chapter;

    if (Object.keys(filter).length === 0) {
      return NextResponse.json({ error: 'At least one filter (year/subject/chapter) required' }, { status: 400 });
    }

    const result = await Question.deleteMany(filter);
    return NextResponse.json({ 
      message: `Deleted ${result.deletedCount} questions`, 
      count: result.deletedCount,
      filter 
    });
  } catch (error) {
    console.error('Delete questions error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
