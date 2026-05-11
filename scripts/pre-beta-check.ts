// Pre-Beta Health Check - SkillPlay
import fetch from 'node-fetch';

const API_URL = process.env.API_URL ?? 'https://api.skillplay.app';
const ADMIN_URL = process.env.ADMIN_URL ?? 'https://admin.skillplay.app';
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? '';

async function fetchWithTimeout(url: string, options: any = {}): Promise<any> {
  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(5000),
  });
}

const CHECKS: { name: string; blocking: boolean; fn: () => Promise<boolean> }[] = [];

function check(name: string, blocking: boolean, fn: () => Promise<boolean>) {
  CHECKS.push({ name, blocking, fn });
}

// Checks bloqueantes
check('API health', true, async () => {
  const res = await fetchWithTimeout(${API_URL}/health);
  return res.ok;
});

check('Firebase conectado', true, async () => {
  const res = await fetchWithTimeout(${API_URL}/health/firebase);
  return res.ok;
});

check('Stripe conectado', true, async () => {
  const res = await fetchWithTimeout(${API_URL}/health/stripe);
  return res.ok;
});

check('Fondos no negativos', true, async () => {
  const res = await fetchWithTimeout(${API_URL}/health/funds);
  const data = await res.json() as any;
  return res.ok && data.funds?.every((f: any) => (f.balance ?? 0) >= 0);
});

// Check no bloqueante - modo protección
check('Fondos - modo protección', false, async () => {
  const res = await fetchWithTimeout(${API_URL}/health/funds);
  const data = await res.json() as any;
  const protectedFunds = (data.funds ?? []).filter((f: any) => f.protectionMode);
  
  if (protectedFunds.length > 0) {
    console.warn(?? Fondos en modo protección: );
  }
  return true;
});

async function runChecks() {
  console.log('-------------------------------------------');
  console.log('  ?? SkillPlay Pre-Beta Health Check');
  console.log(  );
  console.log('-------------------------------------------\n');

  let passed = 0;
  let failed = 0;
  const failedNames: string[] = [];

  for (const c of CHECKS) {
    try {
      const ok = await c.fn();
      if (ok) {
        console.log(? );
        passed++;
      } else {
        if (c.blocking) {
          console.error(? );
          failed++;
          failedNames.push(c.name);
        } else {
          console.warn(?? );
        }
      }
    } catch (err: any) {
      const msg = err.name === 'TimeoutError' ? 'timeout (>5s)' : err.message;
      if (c.blocking) {
        console.error(?  - );
        failed++;
        failedNames.push(c.name);
      } else {
        console.warn(??  - );
      }
    }
  }

  if (failed > 0) {
    console.error(\n??  check(s) BLOQUEANTE(s) fallaron:);
    failedNames.forEach(n => console.error(   • ));
    console.error('\nNO distribuir la beta hasta resolver estos errores.\n');
    process.exit(1);
  } else {
    console.log('\n?? Todo OK. La beta puede distribuirse.\n');
    process.exit(0);
  }
}

runChecks();

