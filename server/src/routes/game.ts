// Game Routes - SkillPlay
import { Router } from 'express';
import { db } from '../../firebase-admin';

const router = Router();

// POST /api/game/submit
router.post('/submit', async (req, res) => {
  try {
    const { sessionId, answers } = req.body;
    
    // Verificar shadow ban
    const sessionRef = db.collection('games').doc(sessionId);
    const session = await sessionRef.get();
    
    if (!session.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Calcular precisión
    const verifiedAnswers = answers.map((a: any) => ({
      ...a,
      isCorrect: a.selected === a.correct
    }));
    
    const accuracy = verifiedAnswers.filter((a: any) => a.isCorrect).length / verifiedAnswers.length;

    // Shadow ban check
    if (accuracy > 0.98) {
      await sessionRef.update({
        status: 'under_review',
        accuracy: Math.round(accuracy * 100),
        completedAt: new Date()
      });
      
      return res.json({
        prize: 0,
        status: 'under_review',
        message: 'Tu sesión está siendo verificada por seguridad.'
      });
    }

    // Calcular premio normal
    const prize = Math.round(accuracy * 100) / 100;
    
    await sessionRef.update({
      status: 'completed',
      prize,
      accuracy: Math.round(accuracy * 100),
      completedAt: new Date()
    });

    return res.json({
      prize,
      status: 'completed',
      accuracy: Math.round(accuracy * 100)
    });

  } catch (err) {
    console.error('Game submit error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

