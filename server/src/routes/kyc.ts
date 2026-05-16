import { Router, Request, Response } from 'express';
import express from 'express';
import { createKycSession, processKycWebhook } from '../services/kycService';

const router = Router();

// POST /api/kyc/initiate
router.post('/initiate', async (req: Request, res: Response) => {
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

// POST /api/kyc/webhook — usa raw body para verificar firma HMAC
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    try {
      const signature = req.headers['x-signature'] as string;

      // req.body aquí es un Buffer, lo convertimos a string
      const rawBody = req.body.toString('utf8');
      const payload = JSON.parse(rawBody);

      const result = await processKycWebhook(rawBody, signature, payload);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('KYC webhook error:', err);
      return res.status(400).json({ error: err.message });
    }
  }
);

export default router;