// Week 1 Dashboard - SkillPlay
import { db } from '../server/src/firebase-admin';

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value);
}

type ConfidenceLevel = 'insufficient' | 'low' | 'medium' | 'high';

interface MetricResult {
  value: number | null;
  confidence: ConfidenceLevel;
  sampleSize: number;
  marginOfError: number;
}

function calculateConfidence(n: number): ConfidenceLevel {
  if (n >= 100) return 'high';
  if (n >= 30) return 'medium';
  if (n >= 10) return 'low';
  return 'insufficient';
}

function isSameLocalDay(date1: Date, date2: Date, timezone: string): boolean {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const getParts = (d: Date) => {
      const parts = fmt.formatToParts(d);
      return {
        year: parts.find(p => p.type === 'year')?.value,
        month: parts.find(p => p.type === 'month')?.value,
        day: parts.find(p => p.type === 'day')?.value,
      };
    };
    const p1 = getParts(date1);
    const p2 = getParts(date2);
    return p1.year === p2.year && p1.month === p2.month && p1.day === p2.day;
  } catch {
    return date1.toISOString().slice(0, 10) === date2.toISOString().slice(0, 10);
  }
}

async function calculateD7Retention(users: any[], games: any[]): Promise<MetricResult> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const matureUsers = users.filter(u => {
    const created = toDate(u.createdAt);
    return created !== null && created < sevenDaysAgo;
  });

  const n = matureUsers.length;
  const confidence = calculateConfidence(n);

  if (confidence === 'insufficient') {
    return { value: null, confidence, sampleSize: n, marginOfError: 0 };
  }

  const retained = matureUsers.filter(u => {
    if (!u.createdAt) return false;
    const created = toDate(u.createdAt);
    if (!created) return false;
    const day7Local = new Date(created.getTime() + 6 * 24 * 60 * 60 * 1000);
    const userTimezone = u.timezone ?? 'UTC';
    return games.some(g => {
      if (g.userId !== u.id) return false;
      const started = toDate(g.startedAt);
      if (!started) return false;
      return isSameLocalDay(day7Local, started, userTimezone);
    });
  });

  return {
    value: Math.round(retained.length / n * 100),
    confidence,
    sampleSize: n,
    marginOfError: 0,
  };
}

async function printWeek1Dashboard() {
  console.log('-----------------------------------------------');
  console.log('  ?? SkillPlay - Week 1 Dashboard');
  console.log(  );
  console.log('-----------------------------------------------\n');

  const [usersSnap, gamesSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('games').where('status', '==', 'completed').get(),
  ]);

  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const games = gamesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const d7Result = await calculateD7Retention(users, games);

  console.log('RETENCIÓN D7');
  if (d7Result.value !== null) {
    const icon = d7Result.confidence === 'high' ? '?' : d7Result.confidence === 'medium' ? '??' : '?';
    console.log(   % (n=, confianza: ));
  } else {
    console.log('  ? Datos insuficientes');
  }

  console.log('\n(Actualizando cada 30 min)');
}

printWeek1Dashboard().catch(console.error);

