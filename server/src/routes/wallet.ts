import { Router } from 'express';
import { db } from '../db';

const router = Router();

// GET /api/wallet/balance/:userId
router.get('/balance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userRef = db.collection('users').doc(userId);
    const user = await userRef.get();

    if (!user.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const data = user.data()!;
    return res.json({
      balance: data.balance || 0,
      dailyEarned: data.dailyEarned || 0,
      dailyLimit: data.dailyLimit || 50,
      totalEarned: data.totalEarned || 0,
      totalWithdrawn: data.totalWithdrawn || 0
    });

  } catch (err) {
    console.error('Balance error:', err);
    return res.status(500).json({ error: 'Error obteniendo saldo' });
  }
});

// GET /api/wallet/transactions/:userId
router.get('/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const snapshot = await db.collection('transactions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.json({ transactions });

  } catch (err) {
    console.error('Transactions error:', err);
    return res.status(500).json({ error: 'Error obteniendo transacciones' });
  }
});

// POST /api/wallet/withdraw
router.post('/withdraw', async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const userData = userDoc.data()!;

    if (userData.kycStatus !== 'verified') {
      return res.status(403).json({ error: 'KYC no verificado. Completa la verificación antes de retirar.' });
    }

    if (userData.balance < amount) {
      return res.status(400).json({ error: 'Saldo insuficiente' });
    }

    if (amount < 5) {
      return res.status(400).json({ error: 'El mínimo de retiro es 5 EUR' });
    }

    // Registrar transacción pendiente
    const txRef = await db.collection('transactions').add({
      userId,
      type: 'withdrawal',
      amount,
      balanceBefore: userData.balance,
      balanceAfter: userData.balance - amount,
      status: 'pending',
      createdAt: new Date()
    });

    // Descontar saldo
    await userRef.update({
      balance: userData.balance - amount,
      totalWithdrawn: (userData.totalWithdrawn || 0) + amount
    });

    return res.json({
      success: true,
      message: 'Retiro solicitado. Se procesará en 24-48h.',
      transactionId: txRef.id
    });

  } catch (err) {
    console.error('Withdraw error:', err);
    return res.status(500).json({ error: 'Error procesando retiro' });
  }
});

export default router;