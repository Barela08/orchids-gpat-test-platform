import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { TestResult } from '@/lib/models/TestResult';

export async function GET() {
  try {
    await connectDB();
    const students = await User.find({ role: 'student' }).select('-password').sort({ createdAt: -1 });
    return NextResponse.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('id');

    if (studentId) {
      const student = await User.findById(studentId);
      if (!student || student.role === 'admin') {
        return NextResponse.json({ error: 'Student not found or cannot delete admin' }, { status: 400 });
      }
      
      await TestResult.deleteMany({ userId: studentId });
      await User.findByIdAndDelete(studentId);
      
      return NextResponse.json({ message: 'Student and their results deleted' });
    }

    return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
