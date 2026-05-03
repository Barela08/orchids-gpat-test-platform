import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Question } from '@/lib/models/Question';

export async function GET(
  request: Request,
  { params }: { params: { subject: string } }
) {
  try {
    await connectDB();
    const { subject } = params;
    
    if (!subject) {
      return NextResponse.json({ error: 'Subject parameter required' }, { status: 400 });
    }

    const chapters = await Question.distinct('chapter', { subject });
    const chaptersWithCount = await Promise.all(
      chapters.map(async (chapter) => {
        const count = await Question.countDocuments({ subject, chapter });
        return { chapter, count };
      })
    );

    chaptersWithCount.sort((a, b) => b.count - a.count);

    return NextResponse.json(chaptersWithCount);
  } catch (error) {
    console.error('Get chapters error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
