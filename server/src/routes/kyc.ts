import { Router } from 'express';
import { createKycSession, processKycWebhook } from '../services/kycService';

const router = Router();

// POST /api/kyc/initiate
router.post('/initiate', async (req, res) => {
  try {
    const { userId, firstName, lastName } = req.body;

    if (!userId || !firstName || !lastName) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const session = await createKycSession(userId, firstName, lastName);

    return res.json({
      success: true,
      sessionId: session.sessionId,
      sessionUrl: session.sessionUrl
    });

  } catch (err: any) {
    console.error('KYC initiate error:', err);
    return res.status(500).json({ error: err.message || 'Error iniciando KYC' });
  }
});

// POST /api/kyc/webhook
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-signature'] as string;
    const result = await processKycWebhook(req.body, signature);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('KYC webhook error:', err);
    return res.status(400).json({ error: err.message });
  }
});

export default router;