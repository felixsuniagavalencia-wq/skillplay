import axios from 'axios';
import crypto from 'crypto';
import { db } from '../db';

const VERIFF_API_KEY = process.env.VERIFF_API_KEY || '';
const VERIFF_SECRET_KEY = process.env.VERIFF_SECRET_KEY || '';
const VERIFF_BASE_URL = 'https://stationapi.veriff.com';

// Genera firma X-SIGNATURE: SHA256(payload + secret)
function generateSignature(payloadStr: string): string {
  return crypto
    .createHash('sha256')
    .update(payloadStr + VERIFF_SECRET_KEY)
    .digest('hex');
}

// Crear sesión de verificación KYC
export async function createKycSession(userId: string, firstName: string, lastName: string) {
  try {
    const payload = {
      verification: {
        callback: `https://skillplay-production.up.railway.app/api/kyc/webhook`,
        person: {
          firstName,
          lastName
        },
        vendorData: userId,
        timestamp: new Date().toISOString()
      }
    };

    const payloadStr = JSON.stringify(payload);
    const signature = generateSignature(payloadStr);

    const response = await axios.post(
      `${VERIFF_BASE_URL}/v1/sessions`,
      payload,
      {
        headers: {
          'X-AUTH-CLIENT': VERIFF_API_KEY,
          'X-SIGNATURE': signature,
          'Content-Type': 'application/json'
        }
      }
    );

    const session = response.data.verification;

    await db.collection('users').doc(userId).update({
      kycSessionId: session.id,
      kycStatus: 'pending'
    });

    return {
      sessionId: session.id,
      sessionUrl: session.url,
      status: session.status
    };

  } catch (err: any) {
    console.error('KYC session error:', err?.response?.data || err.message);
    throw new Error('Error creando sesión KYC');
  }
}

// Procesar webhook de Veriff
export async function processKycWebhook(
  rawBody: string,
  signature: string,
  payload: any
) {
  const expectedSignature = generateSignature(rawBody);

  if (signature !== expectedSignature) {
    throw new Error('Firma inválida');
  }

  const { status, vendorData: userId } = payload.verification || {};

  if (!userId) return;

  let kycStatus = 'pending';
  if (status === 'approved') kycStatus = 'verified';
  else if (status === 'declined' || status === 'resubmission_requested') kycStatus = 'rejected';

  await db.collection('users').doc(userId).update({
    kycStatus,
    kycUpdatedAt: new Date(),
    ...(kycStatus === 'verified' && {
      accountLevel: 'basic',
      dailyLimit: 150
    })
  });

  return { userId, kycStatus };
}