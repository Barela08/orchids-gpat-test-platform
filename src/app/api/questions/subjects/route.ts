import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Question } from '@/lib/models/Question';

export async function GET() {
  try {
    await connectDB();
    
    const subjects = await Question.distinct('subject');
    const subjectsWithCount = await Promise.all(
      subjects.map(async (subject) => {
        const count = await Question.countDocuments({ subject });
        return { subject, count };
      })
    );

    subjectsWithCount.sort((a, b) => b.count - a.count);

    return NextResponse.json(subjectsWithCount);
  } catch (error) {
    console.error('Get subjects error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
