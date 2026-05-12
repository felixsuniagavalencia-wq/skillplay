// Stripe Service - SkillPlay
import Stripe from 'stripe';
import { db } from '../firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export async function createPayout(userId: string, amount: number, iban: string, accountName: string) {
  try {
    // Obtener usuario
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new Error('Usuario no encontrado');
    }

    const user = userDoc.data();
    
    // Verificar balance
    if ((user?.balance || 0) < amount) {
      throw new Error('Balance insuficiente');
    }

    // Crear transferencia
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Convertir a centavos
      currency: 'eur',
      destination: iban,
      description: `Payout para ${accountName}`,
    });

    // Actualizar balance
    await userRef.update({
      balance: (user?.balance || 0) - amount,
    });

    return {
      success: true,
      transferId: transfer.id,
      amount,
    };

  } catch (err: any) {
    console.error('Stripe payout error:', err);
    throw new Error(err.message || 'Error al procesar el retiro');
  }
}

export default stripe;