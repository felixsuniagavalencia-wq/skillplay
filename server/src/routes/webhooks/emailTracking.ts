// Email Tracking Webhook - SkillPlay
import { Router } from 'express';
import { db } from '../../firebase-admin';

const router = Router();

// POST /api/webhooks/email-tracking
router.post('/email-tracking', async (req, res) => {
  // ACK inmediato - SendGrid necesita 200/202 en < 10s
  res.status(202).json({ received: true });

  const events = Array.isArray(req.body) ? req.body : [req.body];
  if (events.length === 0) return;

  console.log([emailTracking]  eventos recibidos);

  try {
    for (const { email, event: eventType, url, reason } of events) {
      if (!email || !eventType) continue;

      const snap = await db.collection('b2bContacts')
        .where('contactEmail', '==', email.toLowerCase())
        .limit(1)
        .get();

      if (snap.empty) {
        console.warn([emailTracking] Email no encontrado: );
        continue;
      }

      const ref = snap.docs[0].ref;
      const now = new Date();

      switch (eventType) {
        case 'delivered':
          await ref.update({ status: 'sent', deliveredAt: now });
          break;
        case 'open':
          await ref.update({ status: 'opened', lastOpenedAt: now });
          break;
        case 'click':
          await ref.update({ lastClickedAt: now, lastClickedUrl: url ?? null });
          break;
        case 'bounce':
        case 'dropped':
          await ref.update({ status: 'rejected', rejectReason: reason ?? email_ });
          break;
        case 'unsubscribe':
          await ref.update({ status: 'rejected', rejectReason: 'unsubscribed' });
          break;
        case 'spam_report':
          await ref.update({ status: 'rejected', rejectReason: 'spam_report' });
          break;
      }
    }

    console.log([emailTracking]  eventos procesados);
  } catch (err) {
    console.error('[emailTracking] Error:', err);
  }
});

// GET /api/webhooks/email-tracking/health
router.get('/email-tracking/health', async (_req, res) => {
  res.json({
    status: 'healthy',
    webhookEndpoint: '/api/webhooks/email-tracking',
    requiredEvents: ['open', 'click', 'delivered', 'bounce', 'dropped', 'unsubscribe', 'spam_report'],
  });
});

export default router;

