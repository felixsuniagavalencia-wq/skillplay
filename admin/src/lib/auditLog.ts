// Audit Log - SkillPlay Admin
import { db } from './firebase-admin';

export async function writeAuditLog(entry: {
  ip: string;
  path: string;
  method: string;
  action?: string;
  userId?: string;
}) {
  db.collection('adminAuditLog').add({
    ...entry,
    timestamp: new Date(),
  }).catch(err => console.error('Audit log write failed:', err));
}

