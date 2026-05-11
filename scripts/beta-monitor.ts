// Beta Monitor - SkillPlay
import { db } from '../server/src/firebase-admin';

interface FundData {
  id: string;
  balance: number;
  maxCapacity: number;
  protectionMode: boolean;
}

async function printBetaStats() {
  try {
    const [usersSnap, gamesSnap, txSnap, reviewsSnap, fundsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('games').where('status', '==', 'completed').get(),
      db.collection('transactions').where('type', '==', 'withdrawal').get(),
      db.collection('reviews').where('status', '==', 'pending').get(),
      db.collection('prizeFunds').get(),
    ]);

    const users = usersSnap.docs.map(d => d.data());
    const games = gamesSnap.docs.map(d => d.data());
    const txs = txSnap.docs.map(d => d.data());
    const funds = fundsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FundData));

    const verified = users.filter(u => u.kycStatus === 'verified').length;
    const totalBalance = users.reduce((s, u) => s + (u.balance ?? 0), 0);
    const avgAccuracy = games.length
      ? Math.round(games.reduce((s, g) => s + (g.accuracy ?? 0), 0) / games.length)
      : 0;
    const totalPrizes = games.reduce((s, g) => s + (g.prize ?? 0), 0);
    const pendingWithdrawals = txs.filter(t => t.status === 'pending').length;
    const fundsInProtection = funds.filter(f => f.protectionMode);

    console.clear();
    console.log('----------------------------------------------');
    console.log('  SkillPlay Beta - Monitor en tiempo real');
    console.log(  );
    console.log('----------------------------------------------\n');

    console.log('?? USUARIOS');
    console.log(   Total: );
    console.log(   KYC:  (%));
    console.log(   Flaggeados: );
    console.log(   Saldo total:  €\n);

    console.log('?? SESIONES');
    console.log(   Completadas: );
    console.log(   Precisión media: %);
    console.log(   Premios:  €\n);

    console.log('?? FONDOS:');
    funds.forEach(f => {
      const pct = f.maxCapacity > 0 ? (f.balance / f.maxCapacity * 100) : 0;
      const bar = '¦'.repeat(Math.round(Math.min(pct, 100) / 10)) + '¦'.repeat(10 - Math.round(Math.min(pct, 100) / 10));
      const alert = f.protectionMode ? ' ?? PROTECCIÓN' : pct < 40 ? ' ?? BAJO' : '';
      console.log(     % -  €);
    });

    if (fundsInProtection.length > 0) {
      console.log('\n?? FONDOS EN MODO PROTECCIÓN:');
      fundsInProtection.forEach(f => {
        const pct = f.maxCapacity > 0 ? (f.balance / f.maxCapacity * 100) : 0;
        console.log(   : % -  €);
      });
    }

    console.log('\n?? SEGURIDAD');
    console.log(   Revisiones pendientes: );
    if (reviewsSnap.size > 0) console.log('   ?? HAY REVISIONES PENDIENTES');
    if (pendingWithdrawals > 10) console.log('   ?? MUCHOS RETIROS PENDIENTES');

    console.log('\n(Actualizando cada 60s - Ctrl+C para salir)');

  } catch (err: any) {
    console.error(\n? Error: );
  }
}

printBetaStats();
setInterval(printBetaStats, 60000);

