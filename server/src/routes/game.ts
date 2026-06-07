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

const FREE_GAMES_LIMIT = 15;
const FREE_GAMES_REFILL = 5;
const FREE_GAMES_REFILL_HOURS = 48;
const EPIC_QUESTION_MULTIPLIER = 3.5;

const langMap: Record<string, string> = {
  es: 'español',
  en: 'English',
  pt: 'português',
  fr: 'français',
  de: 'Deutsch',
  it: 'italiano'
};

function calculateFreeGamesStatus(userData: any) {
  const freeGamesLeft = userData.freeGamesLeft ?? FREE_GAMES_LIMIT;
  const lastFreeGamesRefill = userData.lastFreeGamesRefill?.toDate?.() || null;
  const now = new Date();

  if (freeGamesLeft > 0) {
    return { freeGamesLeft, canRefill: false, nextRefillAt: null };
  }

  if (lastFreeGamesRefill) {
    const hoursSinceRefill = (now.getTime() - lastFreeGamesRefill.getTime()) / (1000 * 60 * 60);
    if (hoursSinceRefill >= FREE_GAMES_REFILL_HOURS) {
      return { freeGamesLeft: 0, canRefill: true, nextRefillAt: null };
    } else {
      const nextRefillAt = new Date(lastFreeGamesRefill.getTime() + FREE_GAMES_REFILL_HOURS * 60 * 60 * 1000);
      return { freeGamesLeft: 0, canRefill: false, nextRefillAt };
    }
  }

  return { freeGamesLeft: 0, canRefill: true, nextRefillAt: null };
}

// POST /api/game/generate
router.post('/generate', async (req, res) => {
  try {
    const { category, difficulty, entryFee, userId, isFreeGame, language } = req.body;

    if (!category || !difficulty || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const langName = langMap[language] || 'English';

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data()!;

    if (userData.freeGamesLeft === undefined) {
      await userRef.update({ freeGamesLeft: FREE_GAMES_LIMIT });
      userData.freeGamesLeft = FREE_GAMES_LIMIT;
    }

    let { freeGamesLeft, canRefill } = calculateFreeGamesStatus(userData);

    if (canRefill) {
      const newFreeGames = Math.min((freeGamesLeft || 0) + FREE_GAMES_REFILL, FREE_GAMES_LIMIT);
      await userRef.update({
        freeGamesLeft: newFreeGames,
        lastFreeGamesRefill: new Date()
      });
      freeGamesLeft = newFreeGames;
    }

    const isActuallyFree = isFreeGame === true && freeGamesLeft > 0;

    if (!isActuallyFree && (userData.balance || 0) < entryFee) {
      return res.status(400).json({ error: 'Insufficient balance. Please top up your wallet.' });
    }

    let newBalance = userData.balance || 0;
    if (!isActuallyFree && entryFee > 0) {
      newBalance = Math.round(((userData.balance || 0) - entryFee) * 100) / 100;
      await userRef.update({ balance: newBalance });

      await db.collection('transactions').add({
        userId,
        type: 'entry_fee',
        amount: entryFee,
        balanceBefore: userData.balance || 0,
        balanceAfter: newBalance,
        status: 'completed',
        createdAt: new Date()
      });
    }

    if (isActuallyFree) {
      const newFreeGamesLeft = Math.max(0, freeGamesLeft - 1);
      const updateData: any = { freeGamesLeft: newFreeGamesLeft };
      if (newFreeGamesLeft === 0) {
        updateData.lastFreeGamesRefill = new Date();
      }
      await userRef.update(updateData);
      freeGamesLeft = newFreeGamesLeft;
    }

    const hasEpicQuestion = Math.random() < 0.2;
    const epicQuestionIndex = hasEpicQuestion ? Math.floor(Math.random() * 5) : -1;
    const randomSeed = Math.floor(Math.random() * 1000000);
    const timestamp = Date.now();

    const prompt = `Generate 5 UNIQUE and ORIGINAL trivia questions in ${langName} about "${category}" with difficulty "${difficulty}".

IMPORTANT:
- Random seed: ${randomSeed}
- Timestamp: ${timestamp}
- Avoid very basic and well-known questions
- Questions must be specific, detailed, surprising and uncommon
- Each game must feel completely different from the previous one
${hasEpicQuestion ? `- Question number ${epicQuestionIndex + 1} must be EXTREMELY difficult, almost impossible for an average user.` : ''}

Respond ONLY with valid JSON, no extra text, no markdown, no backticks:
{
  "questions": [
    {
      "question": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correct": 0,
      "explanation": "brief explanation",
      "isEpic": false
    }
  ]
}

The "correct" field is the index (0-3) of the correct option.
The "isEpic" field is true only for the extremely difficult question.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response from Claude');
    }

    const rawText = content.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(rawText);

    const epicBase = isActuallyFree ? 1 : (entryFee || 1);
    const epicPrizeAmount = Math.round(epicBase * EPIC_QUESTION_MULTIPLIER * 100) / 100;

    if (hasEpicQuestion && parsed.questions[epicQuestionIndex]) {
      parsed.questions[epicQuestionIndex].isEpic = true;
      parsed.questions[epicQuestionIndex].epicPrize = epicPrizeAmount;
    }

    const sessionRef = db.collection('games').doc();
    await sessionRef.set({
      userId,
      category,
      difficulty,
      entryFee: isActuallyFree ? 0 : entryFee,
      isFreeGame: isActuallyFree,
      questions: parsed.questions,
      epicQuestionIndex,
      hasEpicQuestion,
      epicPrizeAmount,
      status: 'active',
      startedAt: new Date()
    });

    const { nextRefillAt } = calculateFreeGamesStatus({ ...userData, freeGamesLeft });

    return res.json({
      sessionId: sessionRef.id,
      isFreeGame: isActuallyFree,
      freeGamesLeft,
      nextRefillAt: nextRefillAt ? nextRefillAt.toISOString() : null,
      questions: parsed.questions.map((q: any) => ({
        question: q.question,
        options: q.options,
        isEpic: q.isEpic || false,
        epicPrize: q.epicPrize || 0
      })),
      fullQuestions: parsed.questions
    });

  } catch (err: any) {
    console.error('Game generate error:', err);
    return res.status(500).json({ error: err.message || 'Error generating questions' });
  }
});

// POST /api/game/submit
router.post('/submit', async (req, res) => {
  try {
    const { sessionId, answers, streak } = req.body;

    const sessionRef = db.collection('games').doc(sessionId);
    const session = await sessionRef.get();

    if (!session.exists) {
      return res.status(404).json({ error: 'Session not found' });
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

    const avgTime = answers.reduce((s: number, a: any) => s + (a.responseTimeMs || 5000), 0) / answers.length;
    const speedBonus = avgTime < 3000 ? 1 : 0;
    const perfectBonus = correct === questions.length ? 2 : 0;
    const freePoints = correct + speedBonus + perfectBonus;

    let epicPrize = 0;
    if (data.hasEpicQuestion && data.epicQuestionIndex >= 0) {
      const epicAnswer = verifiedAnswers[data.epicQuestionIndex];
      if (epicAnswer?.isCorrect) {
        const epicBase = data.entryFee || 1;
        epicPrize = data.epicPrizeAmount || Math.round(epicBase * EPIC_QUESTION_MULTIPLIER * 100) / 100;
      }
    }

    let prizeFinal = 0;

    if (!data.isFreeGame && data.entryFee > 0) {
      const fundRatio = FUND_RATIO[data.entryFee] || 0.75;
      const contribution = data.entryFee * fundRatio;
      const multiplier = MULTIPLIERS[data.difficulty] || 1.0;
      const basePrize = contribution * multiplier * accuracy;

      const speedBonusPrize = avgTime < 3000 ? basePrize * 0.20 : avgTime < 5000 ? basePrize * 0.10 : 0;
      const streakLevel = Math.min(streak || 0, 5);
      const streakBonus = streakLevel > 3 ? basePrize * 0.10 * (streakLevel - 3) : 0;
      const wrong = questions.length - correct;
      const penalty = wrong * (basePrize * 0.05);

      const raw = basePrize + speedBonusPrize + streakBonus - penalty + epicPrize;
      const prize = Math.min(raw, basePrize * 2.5 + epicPrize);
      prizeFinal = Math.max(0, Math.round(prize * 100) / 100);
    } else {
      prizeFinal = epicPrize;
    }

    await sessionRef.update({
      status: 'completed',
      prize: prizeFinal,
      accuracy: Math.round(accuracy * 100),
      answers: verifiedAnswers,
      freePoints: data.isFreeGame ? freePoints : 0,
      completedAt: new Date()
    });

    const userRef = db.collection('users').doc(data.userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data()!;
      const newGamesPlayed = (userData.gamesPlayed || 0) + 1;
      const newTotalPoints = (userData.totalPoints || 0) + (data.isFreeGame ? freePoints : 0);

      if (prizeFinal > 0) {
        const newBalance = Math.round(((userData.balance || 0) + prizeFinal) * 100) / 100;
        const newDailyEarned = Math.round(((userData.dailyEarned || 0) + prizeFinal) * 100) / 100;
        const newTotalEarned = Math.round(((userData.totalEarned || 0) + prizeFinal) * 100) / 100;

        await userRef.update({
          balance: newBalance,
          dailyEarned: newDailyEarned,
          totalEarned: newTotalEarned,
          gamesPlayed: newGamesPlayed,
          totalPoints: newTotalPoints
        });

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
      } else {
        await userRef.update({
          gamesPlayed: newGamesPlayed,
          totalPoints: newTotalPoints
        });
      }
    }

    return res.json({
      prize: prizeFinal,
      epicPrize,
      freePoints: data.isFreeGame ? freePoints : 0,
      status: 'completed',
      accuracy: Math.round(accuracy * 100),
      isFreeGame: data.isFreeGame,
      breakdown: {
        base: Math.round((prizeFinal - epicPrize) * 100) / 100,
        speed: 0,
        streak: 0,
        penalty: 0,
        epic: epicPrize
      }
    });

  } catch (err) {
    console.error('Game submit error:', err);
    return res.status(500).json({ error: 'Error processing results' });
  }
});

export default router;
