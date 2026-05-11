// Waitlist API - SkillPlay
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { email, country, profile } = body;
  if (!email || !email.includes('@') || !email.includes('.')) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();
  const existing = await db.collection('waitlist')
    .where('email', '==', normalized)
    .limit(1)
    .get();

  if (!existing.empty) {
    return NextResponse.json({ message: 'Ya estás en la lista' }, { status: 200 });
  }

  await db.collection('waitlist').add({
    email: normalized,
    country: country ?? 'unknown',
    profile: profile ?? 'unknown',
    createdAt: new Date(),
    notified: false,
  });

  const count = (await db.collection('waitlist').count().get()).data().count;
  return NextResponse.json({ message: 'Apuntado', position: count }, { status: 201 });
}

export async function GET() {
  const count = (await db.collection('waitlist').count().get()).data().count;
  return NextResponse.json({ count });
}

