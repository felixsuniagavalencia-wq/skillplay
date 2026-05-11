// Beta Feedback Analysis - SkillPlay
import fs from 'fs';
import path from 'path';

interface FeedbackRow {
  profile: string;
  understoodSystem: number;
  confusedWithBetting: string;
  skillTreeMotivation: number;
  mostConfusing: string;
  nps: number;
  rememberedWords: string;
  bugs: string;
}

function parseCSV(filePath: string): FeedbackRow[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    return {
      profile: values[0] || 'unknown',
      understoodSystem: parseInt(values[1]) || 3,
      confusedWithBetting: values[2] || 'No',
      skillTreeMotivation: parseInt(values[3]) || 3,
      mostConfusing: values[4] || '',
      nps: parseInt(values[5]) || 7,
      rememberedWords: (values[6] || '').toLowerCase(),
      bugs: values[7] || '',
    };
  });
}

function calculateNps(rows: FeedbackRow[]): number {
  if (rows.length === 0) return 0;
  const promoters = rows.filter(r => r.nps >= 9).length;
  const detractors = rows.filter(r => r.nps <= 6).length;
  return Math.round(((promoters - detractors) / rows.length) * 100);
}

function buildReport(rows: FeedbackRow[]) {
  const nps = calculateNps(rows);
  const confused = Math.round(rows.filter(r => r.confusedWithBetting === 'Sí').length / rows.length * 100);
  const avgSkillTree = (rows.reduce((s, r) => s + r.skillTreeMotivation, 0) / rows.length).toFixed(1);
  
  console.log('-------------------------------------------');
  console.log('  SkillPlay Beta - Feedback Analysis');
  console.log('-------------------------------------------\n');
  
  console.log(?? NPS:  (objetivo: >35));
  console.log(?? Confusión con apuestas: % (umbral: <20%));
  console.log(?? Skill Tree motivación: /5 (objetivo: >3.5));
  
  // Análisis de palabras recordadas
  const successWords = ['progreso', 'reto', 'maestría', 'dominio', 'nivel', 'racha'];
  const failWords = ['ganar', 'victoria', 'apostar', 'azar', 'duelo', 'versus'];
  
  const remembered = rows.map(r => r.rememberedWords).join(' ');
  const successCount = successWords.filter(w => remembered.includes(w)).length;
  const failCount = failWords.filter(w => remembered.includes(w)).length;
  
  console.log(\n?? Palabras de éxito recordadas: );
  console.log(?? Palabras de fracaso recordadas: );
  
  if (failCount > rows.length * 0.2) {
    console.log('\n?? ALERTA: >20% de testers recuerda palabras de apuestas');
    console.log('   ? Revisar textos antes del lanzamiento público');
  }
  
  // Decisiones automáticas
  const decisions = [];
  if (nps < 35) decisions.push({ action: 'Mejorar onboarding', priority: 'ALTO' });
  if (confused > 20) decisions.push({ action: 'Revisar textos de UI', priority: 'BLOQUEANTE' });
  
  console.log('\n? DECISIONES:');
  decisions.forEach(d => console.log(  [] ));
}

// Ejecutar
const filePath = process.argv[2] || 'feedback.csv';
if (fs.existsSync(filePath)) {
  const rows = parseCSV(filePath);
  buildReport(rows);
} else {
  console.log('Usage: npx ts-node scripts/analyze-beta-feedback.ts feedback.csv');
}

