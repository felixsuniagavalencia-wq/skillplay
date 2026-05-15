import Stripe from 'stripe';
import { db } from '../db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Crear cuenta Connect para el usuario
export async function createConnectAccount(userId: string, email: string) {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'ES',
      email,
      capabilities: {
        transfers: { requested: true }
      }
    });

    await db.collection('users').doc(userId).update({
      stripeAccountId: account.id
    });

    return { accountId: account.id };
  } catch (err: any) {
    throw new Error(err.message || 'Error creando cuenta Stripe');
  }
}

// Obtener link de onboarding de Stripe
export async function getOnboardingLink(accountId: string) {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: 'https://skillplay-production.up.railway.app/api/wallet/stripe/refresh',
    return_url: 'https://skillplay-production.up.railway.app/api/wallet/stripe/return',
    type: 'account_onboarding'
  });
  return link.url;
}

// Procesar retiro
export async function createPayout(userId: string, amount: number, iban: string, accountName: string) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) throw new Error('Usuario no encontrado');

    const user = userDoc.data()!;

    if ((user.balance || 0) < amount) throw new Error('Balance insuficiente');
    if (amount < 5) throw new Error('El mínimo de retiro es 5 EUR');
    if (user.kycStatus !== 'verified') throw new Error('KYC no verificado');

    let stripeAccountId = user.stripeAccountId;

    // Si no tiene cuenta Connect, crear una
    if (!stripeAccountId) {
      const { accountId } = await createConnectAccount(userId, user.email);
      stripeAccountId = accountId;
    }

    // Crear transferencia a cuenta Connect
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: 'eur',
      destination: stripeAccountId,
      description: `SkillPlay withdrawal - ${userId}`
    });

    // Registrar transacción
    await db.collection('transactions').add({
      userId,
      type: 'withdrawal',
      amount,
      balanceBefore: user.balance,
      balanceAfter: user.balance - amount,
      stripeTransferId: transfer.id,
      status: 'completed',
      createdAt: new Date()
    });

    // Actualizar balance
    await userRef.update({
      balance: Math.round((user.balance - amount) * 100) / 100,
      totalWithdrawn: Math.round(((user.totalWithdrawn || 0) + amount) * 100) / 100
    });

    return { success: true, transferId: transfer.id, amount };

  } catch (err: any) {
    console.error('Stripe payout error:', err);
    throw new Error(err.message || 'Error procesando retiro');
  }
}

export default stripe;