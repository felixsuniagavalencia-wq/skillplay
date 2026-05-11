// Admin Routes - SkillPlay
import { Router } from 'express';
import { db } from '../firebase-admin';
import { invalidateMultiplierCache } from '../utils/prizeCalculator';

const router = Router();

// POST /api/admin/invalidate-multiplier-cache
router.post('/invalidate-multiplier-cache', async (req, res) => {
  invalidateMultiplierCache();
  await db.collection('adminAuditLog').add({
    action: 'invalidate_multiplier_cache',
    userId: req.body.userId || 'unknown',
    timestamp: new Date(),
    ip: req.headers['x-forwarded-for'] || 'unknown',
  });
  return res.json({ ok: true, message: 'Cache invalidada' });
});

// POST /api/admin/fund/adjust
router.post('/fund/adjust', async (req, res) => {
  const { category, amount, reason } = req.body;
  if (!category || amount === undefined || !reason) {
    return res.status(400).json({ error: 'category, amount y reason requeridos' });
  }

  const fundRef = db.collection('prizeFunds').doc(category);
  const fundDoc = await fundRef.get();
  const current = fundDoc.data()?.balance ?? 0;

  await fundRef.update({
    balance: current + amount,
  });

  await db.collection('adminAuditLog').add({
    action: 'fund_adjust',
    category,
    amount,
    reason,
    timestamp: new Date(),
  });

  return res.json({ ok: true, newBalance: current + amount });
});

export default router;

