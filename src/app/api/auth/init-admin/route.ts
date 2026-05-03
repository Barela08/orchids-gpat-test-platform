import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';

export async function GET() {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({ email: 'admin' });
    if (existingAdmin) {
      return NextResponse.json({ message: 'Admin already exists' });
    }

    const hashedPassword = await bcrypt.hash('admin1234', 10);

    await User.create({
      name: 'Admin',
      email: 'admin',
      password: hashedPassword,
      role: 'admin'
    });

    return NextResponse.json({ message: 'Admin created successfully' });
  } catch (error) {
    console.error('Init admin error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
