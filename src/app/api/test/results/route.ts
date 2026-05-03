import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { TestResult } from '@/lib/models/TestResult';

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (userId) {
      const results = await TestResult.find({ userId }).sort({ completedAt: -1 });
      return NextResponse.json(results);
    }

    const results = await TestResult.find().sort({ completedAt: -1 });
    return NextResponse.json(results);
  } catch (error) {
    console.error('Get results error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
