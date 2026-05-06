import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDB } from '../../lib/mongodb.js';
import { User } from '../../models/User.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gpat-exam-secret-key-2024';

router.get('/init-admin', async (req, res) => {
  try {
    await connectDB();
    const existingAdmin = await User.findOne({ email: 'admin' });
    if (existingAdmin) {
      return res.json({ message: 'Admin already exists' });
    }
    const hashedPassword = await bcrypt.hash('admin1234', 10);
    await User.create({ name: 'Admin', email: 'admin', password: hashedPassword, role: 'admin' });
    return res.json({ message: 'Admin created successfully' });
  } catch (error) {
    req.log.error({ error }, 'Init admin error');
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    await connectDB();
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    req.log.error({ error }, 'Login error');
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    await connectDB();
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword, role: 'student' });

    return res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    req.log.error({ error }, 'Register error');
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
