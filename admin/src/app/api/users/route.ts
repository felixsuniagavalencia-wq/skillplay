// Users API - SkillPlay Admin
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
  const lastDocId = searchParams.get('lastDocId');

  let q: any = db.collection('users').orderBy('createdAt', 'desc').limit(limit + 1);

  if (filter === 'flagged') q = q.where('isFlagged', '==', true);
  if (filter === 'banned') q = q.where('isBanned', '==', true);
  if (filter === 'unverified') q = q.where('kycStatus', '==', 'pending');

  if (lastDocId) {
    const lastDoc = await db.collection('users').doc(lastDocId).get();
    if (lastDoc.exists) q = q.startAfter(lastDoc);
  }

  const snap = await q.get();
  const docs = snap.docs;
  const hasMore = docs.length > limit;
  const resultDocs = hasMore ? docs.slice(0, limit) : docs;

  return NextResponse.json({
    users: resultDocs.map(d => ({ id: d.id, ...d.data() })),
    hasMore,
    nextCursor: hasMore ? resultDocs[resultDocs.length - 1].id : null,
    total: resultDocs.length,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, action } = body;

  if (!userId || !action) {
    return NextResponse.json({ error: 'userId y action requeridos' }, { status: 400 });
  }

  const userRef = db.collection('users').doc(userId);

  switch (action) {
    case 'ban':
      await userRef.update({ isBanned: true, bannedAt: new Date() });
      return NextResponse.json({ ok: true, action: 'banned' });
    case 'unban':
      await userRef.update({ isBanned: false });
      return NextResponse.json({ ok: true, action: 'unbanned' });
    case 'unflag':
      await userRef.update({ isFlagged: false, flagReason: null });
      return NextResponse.json({ ok: true, action: 'unflagged' });
    default:
      return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
  }
}

