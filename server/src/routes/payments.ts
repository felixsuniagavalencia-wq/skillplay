import { Router } from 'express';
import Stripe from 'stripe';
import { db } from '../db';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10'
});

// POST /api/payments/create-payment-intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    if (amount < 5 || amount > 500) {
      return res.status(400).json({ error: 'El importe debe estar entre 5 y 500 EUR' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // en céntimos
      currency: 'eur',
      metadata: { userId, amount: amount.toString() }
    });

    return res.json({
      success: true,
      clientSecret: paymentIntent.client_secret
    });

  } catch (err: any) {
    console.error('Payment intent error:', err);
    return res.status(500).json({ error: 'Error creando pago' });
  }
});

// POST /api/payments/confirm
router.post('/confirm', async (req, res) => {
  try {
    const { userId, paymentIntentId } = req.body;

    if (!userId || !paymentIntentId) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'El pago no fue completado' });
    }

    if (paymentIntent.metadata.userId !== userId) {
      return res.status(403).json({ error: 'Usuario no autorizado' });
    }

    const amount = parseFloat(paymentIntent.metadata.amount);
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data()!;

    // Acreditar saldo
    await userRef.update({
      balance: (userData.balance || 0) + amount
    });

    // Registrar transacción
    await db.collection('transactions').add({
      userId,
      type: 'deposit',
      amount,
      balanceBefore: userData.balance || 0,
      balanceAfter: (userData.balance || 0) + amount,
      stripePaymentIntentId: paymentIntentId,
      status: 'completed',
      createdAt: new Date()
    });

    return res.json({
      success: true,
      newBalance: (userData.balance || 0) + amount
    });

  } catch (err: any) {
    console.error('Payment confirm error:', err);
    return res.status(500).json({ error: 'Error confirmando pago' });
  }
});

export default router;