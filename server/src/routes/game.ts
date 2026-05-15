import { Router } from 'express';
import { db } from '../db';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MULTIPLIERS: Record<string, number> = {
  basico: 1.0,
  medio: 1.8,
  avanzado: 2.8,
  experto: 4.0
};

const FUND_RATIO: Record<number, number> = {
  0.50: 0.70,
  1.00: 0.72,
  2.50: 0.78,
  5.00: 0.82,
  10.00: 0.85
};

// POST /api/game/generate
router.post('/generate', async (req, res) => {
  try {
    const { category, difficulty, entryFee, userId } = req.body;

    if (!category || !difficulty || !entryFee || !userId) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const prompt = `Genera 5 preguntas de trivia en español sobre "${category}" con dificultad "${difficulty}".
    
Responde SOLO con JSON válido, sin texto adicional, sin markdown, sin backticks:
{
  "questions": [
    {
      "question": "texto de la pregunta",
      "options": ["opción A", "opción B", "opción C", "opción D"],
      "correct": 0,
      "explanation": "explicación breve"
    }
  ]
}

El campo "correct" es el índice (0-3) de la opción correcta.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Respuesta inesperada de Claude');
    }

    const rawText = content.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(rawText);

    const sessionRef = db.collection('games').doc();
    await sessionRef.set({
      userId,
      category,
      difficulty,
      entryFee,
      questions: parsed.questions,
      status: 'active',
      startedAt: new Date()
    });

    return res.json({
      sessionId: sessionRef.id,
      questions: parsed.questions.map((q: any) => ({
        question: q.question,
        options: q.options
      }))
    });

  } catch (err) {
    console.error('Game generate error:', err);
    return res.status(500).json({ error: 'Error generando preguntas' });
  }
});

// POST /api/game/submit
router.post('/submit', async (req, res) => {
  try {
    const { sessionId, answers, streak } = req.body;

    const sessionRef = db.collection('games').doc(sessionId);
    const session = await sessionRef.get();

    if (!session.exists) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    const data = session.data()!;
    const questions = data.questions;

    const verifiedAnswers = answers.map((a: any, i: number) => ({
      ...a,
      isCorrect: a.selected === questions[i].correct,
      responseTimeMs: a.responseTimeMs
    }));

    const correct = verifiedAnswers.filter((a: any) => a.isCorrect).length;
    const accuracy = correct / questions.length;

    if (accuracy > 0.98) {
      await sessionRef.update({ status: 'under_review', completedAt: new Date() });
      return res.json({ prize: 0, status: 'under_review', message: 'Sesión en verificación.' });
    }

    const fundRatio = FUND_RATIO[data.entryFee] || 0.75;
    const contribution = data.entryFee * fundRatio;
    const multiplier = MULTIPLIERS[data.difficulty] || 1.0;
    const basePrize = contribution * multiplier * accuracy;

    const avgTime = answers.reduce((s: number, a: any) => s + (a.responseTimeMs || 5000), 0) / answers.length;
    const speedBonus = avgTime < 3000 ? basePrize * 0.20 : avgTime < 5000 ? basePrize * 0.10 : 0;

    const streakLevel = Math.min(streak || 0, 5);
    const streakBonus = streakLevel > 3 ? basePrize * 0.10 * (streakLevel - 3) : 0;

    const wrong = questions.length - correct;
    const penalty = wrong * (basePrize * 0.05);

    const raw = basePrize + speedBonus + streakBonus - penalty;
    const prize = Math.min(raw, basePrize * 2.5);
    const prizeFinal = Math.max(0, Math.round(prize * 100) / 100);

    // Actualizar sesión
    await sessionRef.update({
      status: 'completed',
      prize: prizeFinal,
      accuracy: Math.round(accuracy * 100),
      answers: verifiedAnswers,
      completedAt: new Date()
    });

    // Acreditar premio al balance del usuario
    if (prizeFinal > 0) {
      const userRef = db.collection('users').doc(data.userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data()!;
        const newBalance = Math.round(((userData.balance || 0) + prizeFinal) * 100) / 100;
        const newDailyEarned = Math.round(((userData.dailyEarned || 0) + prizeFinal) * 100) / 100;
        const newTotalEarned = Math.round(((userData.totalEarned || 0) + prizeFinal) * 100) / 100;

        await userRef.update({
          balance: newBalance,
          dailyEarned: newDailyEarned,
          totalEarned: newTotalEarned,
          gamesPlayed: (userData.gamesPlayed || 0) + 1
        });

        // Registrar transacción
        await db.collection('transactions').add({
          userId: data.userId,
          type: 'prize',
          amount: prizeFinal,
          balanceBefore: userData.balance || 0,
          balanceAfter: newBalance,
          gameId: sessionId,
          status: 'completed',
          createdAt: new Date()
        });
      }
    }

    return res.json({
      prize: prizeFinal,
      status: 'completed',
      accuracy: Math.round(accuracy * 100),
      breakdown: {
        base: Math.round(basePrize * 100) / 100,
        speed: Math.round(speedBonus * 100) / 100,
        streak: Math.round(streakBonus * 100) / 100,
        penalty: Math.round(penalty * 100) / 100
      }
    });

  } catch (err) {
    console.error('Game submit error:', err);
    return res.status(500).json({ error: 'Error procesando resultados' });
  }
});

export default router;