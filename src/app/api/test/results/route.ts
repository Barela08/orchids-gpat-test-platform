import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { TestResult } from '@/lib/models/TestResult';

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const year = searchParams.get('year');
    const subject = searchParams.get('subject');
    const chapter = searchParams.get('chapter');

    const filter: any = {};
    if (userId) filter.userId = userId;
    if (year) filter.year = year;
    if (subject) filter.subject = subject;
    if (chapter) filter.chapter = chapter;

    const results = await TestResult.find(filter).sort({ completedAt: -1 });
    return NextResponse.json(results);
  } catch (error) {
    console.error('Get results error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
