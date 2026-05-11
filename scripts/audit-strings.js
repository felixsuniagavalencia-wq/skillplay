const fs   = require('fs');
const path = require('path');

const FORBIDDEN = [
  'ganar', 'victoria', 'derrotar', 'derrota', 'duelo', 'batalla',
  'versus', 'vs ', 'jugador', 'partida', 'monedas', 'bote', 'apostar',
  'azar', 'casino', 'competir', 'enfrentamiento', 'ranking', 'torneo',
];

const ALLOWED_CONTEXTS = [
  'node_modules', '.git', 'archive', 'dist', 'build',
  'audit-strings.js',
];

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'];

function isComment(line) {
  const t = line.trim();
  return (
    t.startsWith('//')   ||
    t.startsWith('*')    ||
    t.startsWith('{/*')  ||
    t.startsWith('*/}')  ||
    t.startsWith('/*')
  );
}

function scanDir(dir) {
  const results = [];
  let files;
  try { files = fs.readdirSync(dir); } catch { return results; }

  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (ALLOWED_CONTEXTS.some(ctx => fullPath.includes(ctx))) continue;

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !file.startsWith('.')) {
      results.push(...scanDir(fullPath));
    } else if (EXTENSIONS.some(ext => file.endsWith(ext))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines   = content.split('\n');

      lines.forEach((line, idx) => {
        if (isComment(line)) return;

        FORBIDDEN.forEach(word => {
          const regex = new RegExp(\\b\\b, 'i');
          if (regex.test(line)) {
            results.push({
              file:    fullPath.replace(process.cwd() + '/', ''),
              line:    idx + 1,
              word,
              context: line.trim().substring(0, 120),
            });
          }
        });
      });
    }
  }
  return results;
}

const findings = scanDir('./');

if (findings.length === 0) {
  console.log('✅ AUDITORÍA PASADA: 0 palabras prohibidas encontradas');
  process.exit(0);
} else {
  console.log(❌ AUDITORÍA FALLIDA:  instancias encontradas\n);
  const byFile = {};
  findings.forEach(f => {
    if (!byFile[f.file]) byFile[f.file] = [];
    byFile[f.file].push(f);
  });
  Object.entries(byFile).forEach(([file, hits]) => {
    console.log(📄 );
    hits.forEach(h => console.log(   L | '' -> ));
    console.log('');
  });
  process.exit(1);
}
