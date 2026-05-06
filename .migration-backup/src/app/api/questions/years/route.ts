import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Question } from '@/lib/models/Question';

export async function GET() {
  try {
    await connectDB();
    
    const years = await Question.distinct('year');
    const yearsWithCount = await Promise.all(
      years.map(async (year) => {
        const count = await Question.countDocuments({ year });
        return { year, count };
      })
    );

    yearsWithCount.sort((a, b) => b.year.localeCompare(a.year));

    return NextResponse.json(yearsWithCount);
  } catch (error) {
    console.error('Get years error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
