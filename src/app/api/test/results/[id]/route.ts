import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { TestResult } from '@/lib/models/TestResult';
import { Question } from '@/lib/models/Question';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const result = await TestResult.findById(id);
    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    const questions = await Question.find({ year: result.year }).sort({ questionNumber: 1 });

    return NextResponse.json({
      result,
      questions
    });
  } catch (error) {
    console.error('Get result error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
