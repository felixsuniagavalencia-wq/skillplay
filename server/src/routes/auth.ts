import { Router } from 'express';
import { db } from '../db';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { userId, email, username } = req.body;

    if (!userId || !email || !username) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const userRef = db.collection('users').doc(userId);
    const existing = await userRef.get();

    if (existing.exists) {
      return res.status(409).json({ error: 'Usuario ya existe' });
    }

    await userRef.set({
      id: userId,
      email,
      username,
      balance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      dailyEarned: 0,
      dailyLimit: 50,
      kycStatus: 'pending',
      accountLevel: 'new',
      gamesPlayed: 0,
      isFlagged: false,
      isBanned: false,
      createdAt: new Date()
    });

    return res.json({ success: true, userId });

  } catch (err) {
    console.error('Auth register error:', err);
    return res.status(500).json({ error: 'Error registrando usuario' });
  }
});

// GET /api/auth/profile/:userId
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userRef = db.collection('users').doc(userId);
    const user = await userRef.get();

    if (!user.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json(user.data());

  } catch (err) {
    console.error('Auth profile error:', err);
    return res.status(500).json({ error: 'Error obteniendo perfil' });
  }
});

export default router;