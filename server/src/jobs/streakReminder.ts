// Streak Reminder Job - SkillPlay
import { db } from '../firebase-admin';

export async function sendStreakReminders() {
  const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const usersSnap = await db.collection('users')
    .where('maxStreak', '>', 0)
    .get();

  const toNotify: { userId: string; streak: number }[] = [];

  for (const doc of usersSnap.docs) {
    const user = doc.data();
    const lastSessionAt = user.lastSessionAt?.toDate();

    if (!lastSessionAt) continue;

    if (
      lastSessionAt <= twentyHoursAgo &&
      lastSessionAt >= twentyFourHoursAgo
    ) {
      toNotify.push({ userId: doc.id, streak: user.maxStreak ?? 0 });
    }
  }

  console.log([streakReminder]  usuarios para notificar);

  for (const { userId, streak } of toNotify) {
    // Aquí iría la lógica de envío de push notification
    console.log(  ? Notificar a : racha de  en riesgo);
  }

  return toNotify.length;
}

