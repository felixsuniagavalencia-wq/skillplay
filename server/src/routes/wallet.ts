// Wallet Routes - SkillPlay
import { Router } from 'express';
import { createPayout } from '../services/stripeService';
import { db } from '../../db';

const router = Router();

// POST /api/wallet/withdraw
router.post('/withdraw', async (req, res) => {
  try {
    const { userId, amount, iban, accountName } = req.body;

    if (!userId || !amount || !iban || !accountName) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Verificar KYC
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists || userDoc.data()?.kycStatus !== 'verified') {
      return res.status(403).json({ error: 'KYC no verificado' });
    }

    // Crear payout
    const result = await createPayout(userId, amount, iban, accountName);
    
    // Registrar transacción
    await db.collection('transactions').add({
      userId,
      type: 'withdrawal',
      amount,
      status: 'completed',
      stripeTransferId: result.transferId,
      createdAt: new Date(),
    });

    return res.json({
      success: true,
      message: 'Retiro procesado correctamente',
      transferId: result.transferId,
    });

  } catch (err: any) {
    console.error('Withdraw error:', err);
    
    // Error de onboarding de Stripe
    if (err.message?.includes('STRIPE_ONBOARDING_REQUIRED')) {
      return res.status(402).json({
        error: 'stripe_onboarding_required',
        message: 'Tu cuenta de Stripe necesita verificación adicional.',
      });
    }

    return res.status(400).json({ error: err.message || 'Error al procesar el retiro' });
  }
});

export default router;