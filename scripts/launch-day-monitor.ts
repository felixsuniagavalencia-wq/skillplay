// Launch Day Monitor - SkillPlay
import { db } from '../server/src/firebase-admin';

const LAUNCH_TARGETS = {
  registrations_day1: 100,
  kyc_conversions: 40,
  sessions_per_user: 2,
};

async function launchDayMonitor() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  try {
    const [usersSnap, gamesSnap, fundsSnap] = await Promise.all([
      db.collection('users').where('createdAt', '>=', startOfDay).get(),
      db.collection('games').where('status', '==', 'completed').where('startedAt', '>=', startOfDay).get(),
      db.collection('prizeFunds').get(),
    ]);

    const newUsers = usersSnap.size;
    const newGames = gamesSnap.size;
    const funds = fundsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

    const kycToday = usersSnap.docs.filter(d => d.data().kycStatus === 'verified').length;
    const kycPct = newUsers > 0 ? Math.round(kycToday / newUsers * 100) : 0;
    const sessionsPerUser = newUsers > 0 ? (newGames / newUsers).toFixed(1) : '0';
    const fundHealth = funds.every((f: any) => (f.balance ?? 0) / (f.maxCapacity ?? 1000) >= 0.5);

    console.clear();
    console.log('?? SkillPlay - Día de Lanzamiento\n');
    console.log(? \n);

    const r1 = newUsers >= LAUNCH_TARGETS.registrations_day1;
    const r2 = kycPct >= LAUNCH_TARGETS.kyc_conversions;
    const r3 = parseFloat(sessionsPerUser) >= LAUNCH_TARGETS.sessions_per_user;
    const r4 = fundHealth;

    console.log(${r1 ? '?' : '??'} Registros hoy:        (objetivo: ));
    console.log(${r2 ? '?' : '??'} KYC conversión:      % (objetivo: >%));
    console.log(${r3 ? '?' : '??'} Sesiones/usuario:     (objetivo: >));
    console.log(${r4 ? '?' : '??'} Salud de fondos:     );

    console.log('\n?? FONDOS:');
    funds.forEach((f: any) => {
      const pct = Math.round((f.balance ?? 0) / (f.maxCapacity ?? 1000) * 100);
      const icon = pct < 20 ? '??' : pct < 50 ? '??' : '??';
      console.log(   :  € (%));
    });

    console.log('\n(Ctrl+C para salir - actualiza cada 60s)');

  } catch (err: any) {
    console.error(\n? Error: );
    console.log('(Reintentando en 60s...)');
  }
}

// Ejecutar inmediatamente y cada 60s
launchDayMonitor();
setInterval(launchDayMonitor, 60000);

