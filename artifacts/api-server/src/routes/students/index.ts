import { Router } from 'express';
import { connectDB } from '../../lib/mongodb.js';
import { User } from '../../models/User.js';
import { TestResult } from '../../models/TestResult.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    await connectDB();
    const students = await User.find({ role: 'student' }).select('-password').sort({ createdAt: -1 });
    return res.json(students);
  } catch (error) {
    req.log.error({ error }, 'Get students error');
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/', async (req, res) => {
  try {
    await connectDB();
    const studentId = req.query.id as string | undefined;
    if (!studentId) return res.status(400).json({ error: 'Student ID required' });

    const student = await User.findById(studentId);
    if (!student || student.role === 'admin') {
      return res.status(400).json({ error: 'Student not found or cannot delete admin' });
    }

    await TestResult.deleteMany({ userId: studentId });
    await User.findByIdAndDelete(studentId);
    return res.json({ message: 'Student and their results deleted' });
  } catch (error) {
    req.log.error({ error }, 'Delete student error');
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
