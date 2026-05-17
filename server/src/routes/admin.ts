// Admin Routes - SkillPlay
import { Router } from 'express';
import { db } from '../db';

const router = Router();

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [usersSnap, txSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('transactions').get()
    ]);

    const users = usersSnap.docs.map(d => d.data());
    const txs = txSnap.docs.map(d => d.data());

    const totalUsers = users.length;
    const verifiedUsers = users.filter(u => u.kycStatus === 'verified').length;
    const totalBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);

    const deposits = txs.filter(t => t.type === 'deposit');
    const withdrawals = txs.filter(t => t.type === 'withdrawal');
    const prizes = txs.filter(t => t.type === 'prize');
    const pendingWithdrawals = txs.filter(t => t.type === 'withdrawal' && t.status === 'pending');

    const totalDeposited = deposits.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalWithdrawn = withdrawals.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalPrizes = prizes.reduce((sum, t) => sum + (t.amount || 0), 0);
    const pendingAmount = pendingWithdrawals.reduce((sum, t) => sum + (t.amount || 0), 0);

    return res.json({
      totalUsers,
      verifiedUsers,
      totalBalance: Math.round(totalBalance * 100) / 100,
      totalDeposited: Math.round(totalDeposited * 100) / 100,
      totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
      totalPrizes: Math.round(totalPrizes * 100) / 100,
      pendingWithdrawals: pendingWithdrawals.length,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      totalTransactions: txs.length
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ error: 'Error obteniendo stats' });
  }
});

// GET /api/admin/withdrawals
router.get('/withdrawals', async (req, res) => {
  try {
    const snap = await db.collection('transactions')
      .where('type', '==', 'withdrawal')
      .limit(50)
      .get();

    const withdrawals = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.json({ withdrawals });
  } catch (err) {
    console.error('Admin withdrawals error:', err);
    return res.status(500).json({ error: 'Error obteniendo retiros' });
  }
});

// POST /api/admin/withdrawal/approve
router.post('/withdrawal/approve', async (req, res) => {
  try {
    const { transactionId } = req.body;
    if (!transactionId) {
      return res.status(400).json({ error: 'transactionId requerido' });
    }

    await db.collection('transactions').doc(transactionId).update({
      status: 'completed',
      processedAt: new Date()
    });

    await db.collection('adminAuditLog').add({
      action: 'withdrawal_approved',
      transactionId,
      timestamp: new Date()
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Admin approve error:', err);
    return res.status(500).json({ error: 'Error aprobando retiro' });
  }
});

// POST /api/admin/withdrawal/reject
router.post('/withdrawal/reject', async (req, res) => {
  try {
    const { transactionId, userId, amount } = req.body;
    if (!transactionId || !userId || !amount) {
      return res.status(400).json({ error: 'transactionId, userId y amount requeridos' });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data()!;

    await userRef.update({
      balance: (userData.balance || 0) + amount,
      totalWithdrawn: Math.max(0, (userData.totalWithdrawn || 0) - amount)
    });

    await db.collection('transactions').doc(transactionId).update({
      status: 'rejected',
      processedAt: new Date()
    });

    await db.collection('adminAuditLog').add({
      action: 'withdrawal_rejected',
      transactionId,
      userId,
      amount,
      timestamp: new Date()
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Admin reject error:', err);
    return res.status(500).json({ error: 'Error rechazando retiro' });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const snap = await db.collection('users')
      .limit(100)
      .get();

    const users = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.json({ users });
  } catch (err) {
    console.error('Admin users error:', err);
    return res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
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

  await fundRef.update({ balance: current + amount });

  await db.collection('adminAuditLog').add({
    action: 'fund_adjust',
    category,
    amount,
    reason,
    timestamp: new Date()
  });

  return res.json({ ok: true, newBalance: current + amount });
});

export default router;