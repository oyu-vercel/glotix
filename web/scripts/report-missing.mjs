import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parse as csvParse } from 'csv-parse/sync';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

function tokenize(text) {
  return text
    .normalize('NFC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0 && !/^\d+$/.test(t));
}

// Lemma map: untranslated-token (lowercase) → headword.
// Capitalized headwords (e.g., "Anja") signal proper nouns and will be filtered out.
const LEMMA = {
  // --- s1 leftovers (49 tokens) ---
  agli: 'gli',
  assaggiarle: 'assaggiare',
  aver: 'avere',
  bellezza: 'bellezza',
  calabresi: 'calabrese',
  ce: 'ci',
  cenano: 'cenare',
  decidono: 'decidere',
  dei: 'di',
  delle: 'di',
  devono: 'dovere',
  escono: 'uscire',
  esercitarti: 'esercitare',
  fammi: 'fare',
  fanno: 'fare',
  fatto: 'fare',
  gentilissimo: 'gentile',
  iniziano: 'iniziare',
  nell: 'in',
  nello: 'in',
  nessun: 'nessuno',
  nessuna: 'nessuno',
  prendete: 'prendere',
  prendono: 'prendere',
  prime: 'primo',
  quest: 'questo',
  questi: 'questo',
  raccontate: 'raccontare',
  respira: 'respirare',
  ricomincia: 'ricominciare',
  saremo: 'essere',
  sarò: 'essere',
  scherzando: 'scherzare',
  scoprono: 'scoprire',
  seguono: 'seguire',
  seri: 'serio',
  siciliani: 'siciliano',
  sorridendo: 'sorridere',
  sorridi: 'sorridere',
  stesse: 'stesso',
  storie: 'storia',
  studiato: 'studiare',
  trovano: 'trovare',
  trovate: 'trovare',
  tutte: 'tutto',
  visitate: 'visitare',
  volete: 'volere',
  volevo: 'volere',
  vorrei: 'volere',

  // --- s2 leftovers (241 tokens) ---
  abbassò: 'abbassare',
  abbia: 'avere',
  accarezzò: 'accarezzare',
  accese: 'accendere',
  ad: 'a',
  afferrata: 'afferrare',
  aggiunse: 'aggiungere',
  aggiunto: 'aggiungere',
  alcuni: 'alcuno',
  altre: 'altro',
  alzò: 'alzare',
  andata: 'andare',
  andate: 'andare',
  andati: 'andare',
  andrà: 'andare',
  annuì: 'annuire',
  appeso: 'appendere',
  appoggiò: 'appoggiare',
  appunti: 'appunto',
  arrivata: 'arrivare',
  aspettato: 'aspettare',
  augurato: 'augurare',
  aveva: 'avere',
  avevano: 'avere',
  avvicina: 'avvicinare',
  avvicinato: 'avvicinare',
  bancarelle: 'bancarella',
  bellissima: 'bello',
  bellissimi: 'bello',
  bellissimo: 'bello',
  buffi: 'buffo',
  caduto: 'cadere',
  camminato: 'camminare',
  camminavamo: 'camminare',
  capita: 'capitare',
  capito: 'capire',
  capivo: 'capire',
  cercavo: 'cercare',
  chiese: 'chiedere',
  chiesto: 'chiedere',
  colto: 'cogliere',
  com: 'come',
  cominciato: 'cominciare',
  cominciava: 'cominciare',
  commedie: 'commedia',
  comprata: 'comprare',
  concentrarmi: 'concentrare',
  concluse: 'concludere',
  conoscerlo: 'conoscere',
  conoscete: 'conoscere',
  continua: 'continuare',
  continuò: 'continuare',
  coppie: 'coppia',
  coprì: 'coprire',
  creavano: 'creare',
  crederai: 'credere',
  curiosi: 'curioso',
  daniele: 'Daniele',
  danno: 'dare',
  dato: 'dare',
  de: 'De',
  decidete: 'decidere',
  deciso: 'decidere',
  detta: 'dire',
  dettagli: 'dettaglio',
  dettaglio: 'dettaglio',
  dialoghi: 'dialogo',
  difendersi: 'difendere',
  difficili: 'difficile',
  dimmi: 'dire',
  dirmi: 'dire',
  disse: 'dire',
  divertita: 'divertire',
  edgard: 'Edgard',
  emozionata: 'emozionato',
  era: 'essere',
  erano: 'essere',
  eravamo: 'essere',
  eri: 'essere',
  esami: 'esame',
  faccia: 'faccia',
  faceva: 'fare',
  fantastico: 'fantastico',
  fece: 'fare',
  felici: 'felice',
  fermò: 'fermare',
  fiato: 'fiato',
  figli: 'figlio',
  finita: 'finire',
  formaggi: 'formaggio',
  fossi: 'essere',
  furbetto: 'furbo',
  ginocchia: 'ginocchio',
  giuro: 'giurare',
  giusta: 'giusto',
  gliel: 'glielo',
  goderci: 'godere',
  godermi: 'godere',
  goduta: 'godere',
  grissini: 'grissino',
  guardata: 'guardare',
  guardate: 'guardare',
  guardava: 'guardare',
  guarderemo: 'guardare',
  guardò: 'guardare',
  illuminate: 'illuminare',
  illuminavano: 'illuminare',
  impazzita: 'impazzire',
  inciampata: 'inciampare',
  incontrato: 'incontrare',
  incontrerà: 'incontrare',
  incontriate: 'incontrare',
  indecisa: 'indeciso',
  iniziamo: 'iniziare',
  iniziato: 'iniziare',
  lampioni: 'lampione',
  lanciato: 'lanciare',
  libri: 'libro',
  luci: 'luce',
  luminosi: 'luminoso',
  lunghissima: 'lungo',
  magica: 'magico',
  maliziosa: 'malizioso',
  mandato: 'mandare',
  mani: 'mano',
  messo: 'mettere',
  minimi: 'minimo',
  mise: 'mettere',
  momenti: 'momento',
  mosse: 'muovere',
  mostrato: 'mostrare',
  nei: 'in',
  nostri: 'nostro',
  numeri: 'numero',
  occhi: 'occhio',
  olive: 'oliva',
  ordinato: 'ordinare',
  organizza: 'organizzare',
  paesi: 'paese',
  parlano: 'parlare',
  parlato: 'parlare',
  parlava: 'parlare',
  passate: 'passare',
  patatine: 'patatina',
  pazza: 'pazzo',
  pazzesca: 'pazzesco',
  pensarci: 'pensare',
  pensato: 'pensare',
  perduto: 'perdere',
  perfetta: 'perfetto',
  piacerà: 'piacere',
  piaciuta: 'piacere',
  piaciuto: 'piacere',
  piani: 'piano',
  polacca: 'polacco',
  posò: 'posare',
  potrai: 'potere',
  potuta: 'potere',
  preparando: 'preparare',
  prese: 'prendere',
  preso: 'prendere',
  profumava: 'profumare',
  proietteranno: 'proiettare',
  questi: 'questo',
  queste: 'questo',
  quel: 'quello',
  quell: 'quello',
  racconta: 'raccontare',
  raccomando: 'raccomandare',
  raccontato: 'raccontare',
  ricordando: 'ricordare',
  riprese: 'riprendere',
  rise: 'ridere',
  rispose: 'rispondere',
  risposto: 'rispondere',
  ritrovate: 'ritrovare',
  romantica: 'romantico',
  romantiche: 'romantico',
  romantico: 'romantico',
  rossa: 'rosso',
  salumi: 'salume',
  sarà: 'essere',
  sarebbe: 'essere',
  scambiati: 'scambiare',
  scelto: 'scegliere',
  scemi: 'scemo',
  scivolato: 'scivolare',
  scoppiò: 'scoppiare',
  scosse: 'scuotere',
  scritto: 'scrivere',
  sedermi: 'sedere',
  sedeva: 'sedere',
  seduta: 'sedere',
  seduti: 'sedere',
  seduto: 'sedere',
  sembrata: 'sembrare',
  sembrava: 'sembrare',
  sembravano: 'sembrare',
  sentirmi: 'sentire',
  sentito: 'sentire',
  sentivo: 'sentire',
  serate: 'serata',
  sia: 'essere',
  sica: 'Sica',
  sognanti: 'sognante',
  sogni: 'sogno',
  sola: 'solo',
  sorrideva: 'sorridere',
  sorrise: 'sorridere',
  spaventati: 'spaventato',
  spiegato: 'spiegare',
  splendeva: 'splendere',
  stata: 'essere',
  stati: 'essere',
  stato: 'essere',
  stava: 'stare',
  stavo: 'stare',
  stavolta: 'stavolta',
  stessa: 'stesso',
  stessi: 'stesso',
  stradine: 'stradina',
  strana: 'strano',
  stupenda: 'stupendo',
  stuzzichini: 'stuzzichino',
  successo: 'succedere',
  sulle: 'su',
  tanta: 'tanto',
  tatuaggi: 'tatuaggio',
  tavolini: 'tavolino',
  teneva: 'tenere',
  tornando: 'tornare',
  tornata: 'tornare',
  torneremo: 'tornare',
  trovato: 'trovare',
  turisti: 'turista',
  tutta: 'tutto',
  ultima: 'ultimo',
  usciti: 'uscire',
  vada: 'andare',
  vederti: 'vedere',
  versato: 'versare',
  vi: 'vi',
  vicoli: 'vicolo',
  visitarla: 'visitare',
  vissuto: 'vivere',
  visto: 'vedere',
  vittorio: 'Vittorio',
  vivendo: 'vivere',
  volato: 'volare',
  volesse: 'volere',
  voleva: 'volere',
  volevo: 'volere',
  volte: 'volta',
};

// Load all vocab sources to build the "covered headwords" set.
const covered = new Set();
const a2 = JSON.parse(
  await readFile(resolve(repoRoot, 'web/public/assets/vocabulary-italian-a2.json'), 'utf8'),
);
for (const cat of a2.categories)
  for (const w of cat.words)
    for (const v of w.italian.toLowerCase().split('/')) covered.add(v.trim());

async function loadExtras(path) {
  const raw = await readFile(path, 'utf8');
  const rows = csvParse(raw, {
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
  for (const row of rows) {
    if (!row[1]) continue;
    if ((row[0] ?? '').toLowerCase() === 'category' && (row[1] ?? '').toLowerCase() === 'italian')
      continue;
    covered.add(row[1].toLowerCase());
  }
}
await loadExtras(resolve(repoRoot, 'docs/stories/s1/benvenute-al-sud.extras.csv'));
await loadExtras(resolve(repoRoot, 'docs/stories/s2/tra-le-stelle-di-roma.extras.csv'));

const STORIES = [
  {
    slug: 'benvenute-al-sud',
    jsonPath: resolve(repoRoot, 'web/public/assets/stories/benvenute-al-sud.json'),
    txtPath: resolve(repoRoot, 'docs/stories/s1/benvenute-al-sud.txt'),
  },
  {
    slug: 'tra-le-stelle-di-roma',
    jsonPath: resolve(repoRoot, 'web/public/assets/stories/tra-le-stelle-di-roma.json'),
    txtPath: resolve(repoRoot, 'docs/stories/s2/tra-le-stelle-di-roma.txt'),
  },
];

// Proper-noun extractor: a token counts as a proper noun if it appears
// capitalized at least once in the story OUTSIDE sentence-initial position.
// We pass over the raw text and only consider mid-sentence capitalized words.
function extractProperNouns(rawText) {
  const text = rawText.normalize('NFC');
  const seen = new Map(); // lowercase -> Set of original-cased forms (mid-sentence)
  // Walk char by char, tracking whether we're at sentence-initial position.
  let atSentenceStart = true;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[.!?…»"\n]/.test(ch)) {
      atSentenceStart = true;
      i++;
      continue;
    }
    if (/[«"\-—–:;,]/.test(ch)) {
      i++;
      continue;
    }
    // Start of a word.
    let j = i;
    while (j < text.length && /[\p{L}\p{N}'’]/u.test(text[j])) j++;
    const word = text.slice(i, j);
    if (word.length > 0 && /^\p{Lu}/u.test(word) && !atSentenceStart) {
      const lower = word.toLowerCase();
      if (!seen.has(lower)) seen.set(lower, new Set());
      seen.get(lower).add(word);
    }
    atSentenceStart = false;
    i = j;
  }
  // Sentence-initial-only capitalized words (like Italian, Comunque, Allora at the
  // beginning of sentences) are excluded by the mid-sentence rule.
  // Pick the canonical form: prefer the longest original casing.
  const out = [];
  for (const [, forms] of seen) {
    const canonical = [...forms].sort((a, b) => b.length - a.length)[0];
    out.push(canonical);
  }
  return out.sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
}

function isProperNoun(headword) {
  return /^\p{Lu}/u.test(headword);
}

const summary = [];
for (const { slug, jsonPath, txtPath } of STORIES) {
  const story = JSON.parse(await readFile(jsonPath, 'utf8'));
  const rawText = await readFile(txtPath, 'utf8');
  const properNounsInStory = extractProperNouns(rawText);
  const tokens = story.untranslated;

  const missingByHeadword = new Map();
  const inflectedSkipped = [];
  const properNounsSkipped = [];
  const unknown = [];

  for (const tok of tokens) {
    const hw = LEMMA[tok];
    if (!hw) {
      // No lemma entry — treat the token itself as the headword.
      const hwLower = tok.toLowerCase();
      if (covered.has(hwLower)) {
        inflectedSkipped.push(tok);
      } else if (isProperNoun(tok) || /^[\p{Lu}]/u.test(tok)) {
        properNounsSkipped.push(tok);
      } else {
        unknown.push(tok);
        if (!missingByHeadword.has(hwLower)) missingByHeadword.set(hwLower, []);
        missingByHeadword.get(hwLower).push(tok);
      }
      continue;
    }
    if (isProperNoun(hw)) {
      properNounsSkipped.push(tok);
      continue;
    }
    if (covered.has(hw.toLowerCase())) {
      inflectedSkipped.push(tok);
      continue;
    }
    if (!missingByHeadword.has(hw.toLowerCase())) missingByHeadword.set(hw.toLowerCase(), []);
    missingByHeadword.get(hw.toLowerCase()).push(tok);
  }

  const collator = new Intl.Collator('it', { sensitivity: 'base' });
  const missingHeadwords = [...missingByHeadword.entries()]
    .map(([hw, toks]) => ({ headword: hw, tokens: toks.sort() }))
    .sort((a, b) => collator.compare(a.headword, b.headword));

  summary.push({
    slug,
    totalUntranslated: tokens.length,
    inflectedSkipped: inflectedSkipped.length,
    properNounsSkipped: properNounsSkipped.length,
    properNounsInUntranslated: [...new Set(properNounsSkipped.map((t) => LEMMA[t] ?? t))].sort(),
    properNounsInStory,
    unknown,
    missingHeadwords,
  });
}

let report = '# Missing-translation report (both stories)\n\n';
report += 'Filtered out: inflected forms of words already in A2 / s1 extras / s2 extras, and proper nouns.\n\n';

for (const s of summary) {
  report += `## ${s.slug}\n\n`;
  report += `**Proper nouns / names in the story** (${s.properNounsInStory.length}): ${s.properNounsInStory.join(', ')}\n\n`;
  report += `- Total untranslated tokens (build output): **${s.totalUntranslated}**\n`;
  report += `- Skipped — inflected forms of covered headwords: **${s.inflectedSkipped}**\n`;
  report += `- Skipped — proper nouns: **${s.properNounsSkipped}** (${s.properNounsInUntranslated.join(', ') || '—'})\n`;
  report += `- **Genuinely missing headwords: ${s.missingHeadwords.length}**\n`;
  if (s.unknown.length) report += `- Unknown (no lemma mapping): ${s.unknown.length} — ${s.unknown.join(', ')}\n`;
  report += '\n';
  if (s.missingHeadwords.length) {
    report += '| Headword | Occurs in story as |\n|---|---|\n';
    for (const { headword, tokens } of s.missingHeadwords) {
      report += `| **${headword}** | ${tokens.join(', ')} |\n`;
    }
  } else {
    report += '_Nothing left — all untranslated tokens are inflected forms or proper nouns._\n';
  }
  report += '\n';
}

const outPath = resolve(repoRoot, 'docs/stories/missing-translations.md');
await writeFile(outPath, report, 'utf8');

console.log('\n=== Proper nouns / names in each story ===');
for (const s of summary) {
  console.log(`\n[${s.slug}]`);
  console.log(`  ${s.properNounsInStory.join(', ')}`);
}

console.log('\n\n=== Missing headwords needing translation ===');
for (const s of summary) {
  console.log(`\n[${s.slug}]`);
  console.log(`  total untranslated: ${s.totalUntranslated}`);
  console.log(`  inflected forms skipped: ${s.inflectedSkipped}`);
  console.log(`  proper nouns skipped: ${s.properNounsSkipped} (${s.properNounsInUntranslated.join(', ') || 'none'})`);
  console.log(`  missing headwords: ${s.missingHeadwords.length}`);
  if (s.missingHeadwords.length) {
    for (const { headword, tokens } of s.missingHeadwords) {
      console.log(`    - ${headword}  ←  ${tokens.join(', ')}`);
    }
  }
  if (s.unknown.length) console.log(`  unknown: ${s.unknown.join(', ')}`);
}
console.log(`\nWrote ${outPath}`);
