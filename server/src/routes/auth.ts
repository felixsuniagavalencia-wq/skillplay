import { Router } from 'express';
import { db } from '../db';
import * as crypto from 'crypto';
import { Resend } from 'resend';

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'skillplay_salt').digest('hex');
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { userId, email, username, password } = req.body;
    if (!userId || !email || !username || !password) {
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
      password: hashPassword(password),
      balance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      dailyEarned: 0,
      dailyLimit: 50,
      kycStatus: 'pending',
      accountLevel: 'new',
      gamesPlayed: 0,
      freeGamesLeft: 15,
      totalPoints: 0,
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

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snapshot.empty) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    if (!userData.password) {
      return res.status(401).json({ error: 'Cuenta sin contraseña. Usa Forgot Password.' });
    }
    const hashedPassword = hashPassword(password);
    if (userData.password !== hashedPassword) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }
    return res.json({ success: true, userId: userDoc.id });
  } catch (err) {
    console.error('Auth login error:', err);
    return res.status(500).json({ error: 'Error en login' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email requerido' });
    }
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snapshot.empty) {
      return res.json({ success: true });
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await snapshot.docs[0].ref.update({ resetCode: code, resetCodeExpiresAt: expiresAt });

    await resend.emails.send({
      from: 'SkillPlay <noreply@skillplay.app>',
      to: email,
      subject: 'Reset your SkillPlay password',
      html: `<div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>Your verification code is:</p>
        <h1 style="font-size: 48px; color: #7C3AED; letter-spacing: 8px;">${code}</h1>
        <p>This code expires in 15 minutes.</p>
      </div>`
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Error enviando email' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Faltan parámetros' });
    }
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snapshot.empty) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    if (userData.resetCode !== code) {
      return res.status(400).json({ error: 'Código inválido' });
    }
    if (new Date() > userData.resetCodeExpiresAt.toDate()) {
      return res.status(400).json({ error: 'Código expirado' });
    }
    await userDoc.ref.update({
      password: hashPassword(newPassword),
      resetCode: null,
      resetCodeExpiresAt: null
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Error reseteando contraseña' });
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
