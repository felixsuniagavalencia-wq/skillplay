// Beta Retention Analysis - SkillPlay
import { db } from '../server/src/firebase-admin';

interface RetentionStats {
  d1: number;
  d2: number;
  d7: number;
  d14: number;
}

async function analyzeRetention() {
  console.log('?? Analizando retención por cohorte...\n');

  const [usersSnap, gamesSnap] = await Promise.all([
    db.collection('users').orderBy('createdAt', 'desc').get(),
    db.collection('games').where('status', '==', 'completed').get(),
  ]);

  const users = usersSnap.docs.map(d => ({
    id: d.id,
    createdAt: d.data().createdAt?.toDate() as Date | undefined,
    profile: d.data().profile ?? 'unknown',
  }));

  const sessionsByUser: Record<string, Date[]> = {};
  gamesSnap.forEach(doc => {
    const { userId, completedAt } = doc.data();
    if (!userId || !completedAt) return;
    const ts = completedAt.toDate() as Date;
    if (!sessionsByUser[userId]) sessionsByUser[userId] = [];
    sessionsByUser[userId].push(ts);
  });

  const WINDOWS_MS = {
    d1: 24 * 60 * 60 * 1000,
    d2: 48 * 60 * 60 * 1000,
    d7: 7 * 24 * 60 * 60 * 1000,
    d14: 14 * 24 * 60 * 60 * 1000,
  };

  const matureUsers = users.filter(u =>
    u.createdAt && (Date.now() - u.createdAt.getTime()) >= WINDOWS_MS.d14
  );

  if (matureUsers.length === 0) {
    console.log('?? Sin usuarios con =14 días - datos no disponibles aún');
    return;
  }

  function retentionAt(windowMs: number): number {
    const returned = matureUsers.filter(u => {
      if (!u.createdAt) return false;
      const sessions = sessionsByUser[u.id] ?? [];
      return sessions.some(s => {
        const elapsed = s.getTime() - u.createdAt!.getTime();
        return elapsed > 0 && elapsed <= windowMs;
      });
    });
    return Math.round((returned.length / matureUsers.length) * 100);
  }

  const stats: RetentionStats = {
    d1: retentionAt(WINDOWS_MS.d1),
    d2: retentionAt(WINDOWS_MS.d2),
    d7: retentionAt(WINDOWS_MS.d7),
    d14: retentionAt(WINDOWS_MS.d14),
  };

  const avgSessions = matureUsers.length > 0
    ? (Object.values(sessionsByUser).reduce((s, sessions) => s + sessions.length, 0) / matureUsers.length).toFixed(1)
    : '0';

  const kycConversion = Math.round(
    usersSnap.docs.filter(d => d.data().kycStatus === 'verified').length /
    Math.max(usersSnap.docs.length, 1) * 100
  );

  console.log('-----------------------------------------------');
  console.log('  ?? SkillPlay Beta - Análisis de Retención');
  console.log(  Base:  usuarios con =14 días);
  console.log('-----------------------------------------------\n');

  const targets = { d1: 35, d2: 25, d7: 15, d14: 10 };

  printRetention('D1 (=24h)', stats.d1, targets.d1);
  printRetention('D2 (=48h)', stats.d2, targets.d2);
  printRetention('D7 (=7d)', stats.d7, targets.d7);
  printRetention('D14 (=14d)', stats.d14, targets.d14);

  console.log(\n  ?? Sesiones/usuario:  (objetivo: >3/semana));
  console.log(  ?? KYC: % (objetivo: >40%)\n);

  console.log('? DECISIONES DE RETENCIÓN\n');
  let hasDecisions = false;

  if (stats.d1 < targets.d1) {
    console.log(  ? [ALTO] D1 % < %);
    console.log('     ? Revisar onboarding\n');
    hasDecisions = true;
  }
  if (stats.d7 < targets.d7) {
    console.log(  ? [ALTO] D7 % < %);
    console.log('     ? Activar notificaciones de racha\n');
    hasDecisions = true;
  }
  if (parseFloat(avgSessions) < 3) {
    console.log(  ?? [MEDIO]  sesiones/usuario < 3);
    hasDecisions = true;
  }

  if (!hasDecisions) console.log('  ? Métricas dentro de objetivos\n');
}

function printRetention(label: string, pct: number, target: number) {
  const status = pct >= target ? '?' : pct >= target * 0.8 ? '??' : '?';
  const bar = '¦'.repeat(Math.round(pct / 5)) + '¦'.repeat(20 - Math.round(pct / 5));
  console.log(     % (obj: %));
}

analyzeRetention().catch(console.error);

