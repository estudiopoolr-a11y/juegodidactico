// engine.js — Motor local del Protocolo (v2, sala asíncrona)
// Todo lo que define tu partida se resuelve AQUÍ, en el dispositivo, sin red.
// La nube solo informa; si la nube falla, la partida sigue y termina.

export const GAME_VERSION = 2;
export const TOTAL_ROUNDS = 5;

// Reloj individual: 15:00 por persona. Presupuesto por ronda: 3:00.
export const TOTAL_CLOCK_S = 900;
export const ROUND_BUDGET_S = 180;

// Ventanas de la ronda
export const MATCH_WINDOW_S = 8;    // buscando humano
export const NEGOTIATION_S = 60;    // charlo con quien me tocó
export const VOTING_S = 45;         // decido
export const RESOLUTION_S = 30;     // veo qué pasó (sabor de auditoría, no bloquea)
export const ABSTENTION_S = 20;     // si el otro no vota, me resuelves contra RESPALDO

// Pagos. Dilema del prisionero estricto: 18 > 10 > 5 > 0 y 2*10 > 18 + 0
export const PAYOFFS = { C: 10, T: 18, P: 5, S: 0 };

// Coste colectivo real por traición unilateral = 2 puntos; por "ambos desertan" = 10
export const COST_BETRAY = PAYOFFS.C * 2 - (PAYOFFS.T + PAYOFFS.S); // 2
export const COST_MUTUAL = PAYOFFS.C * 2 - PAYOFFS.P * 2;           // 10

export const MODIFIERS = [
  { name: 'Estándar', tax: 0, mult: 1 },
  { name: 'Estándar', tax: 0, mult: 1 },
  { name: 'Impuesto de austeridad 10%', tax: 0.10, mult: 1 },
  { name: 'Estándar', tax: 0, mult: 1 },
  { name: 'Factor de contención 0.9', tax: 0, mult: 0.9 }
];

export function applyModifier(score, mod) {
  let s = score;
  if (s > 0 && mod.tax) s = Math.floor(s * (1 - mod.tax));
  if (s > 0 && mod.mult !== 1) s = Math.floor(s * mod.mult);
  return s;
}

export function maxScoreForRound(roundNo) {
  return applyModifier(PAYOFFS.C, MODIFIERS[roundNo - 1] || MODIFIERS[0]);
}

// Máximo teórico por persona cooperando siempre: 10+10+9+10+9 = 48
export function maxPerPlayer() {
  let m = 0;
  for (let r = 1; r <= TOTAL_ROUNDS; r++) m += maxScoreForRound(r);
  return m;
}

// META MÓVIL: el umbral depende de quién terminó de verdad. No es un número imposible.
export const POOL_FACTOR = 0.985;
export function computeThreshold(finishers) {
  const poolMax = maxPerPlayer() * Math.max(1, finishers);
  return { poolMax, threshold: Math.ceil(poolMax * POOL_FACTOR), margin: Math.ceil(poolMax * POOL_FACTOR) - poolMax };
}

// Resultado entre dos humanos.
export function resolveHuman(myVote, otherVote, roundNo) {
  const mod = MODIFIERS[roundNo - 1] || MODIFIERS[0];
  let mine, theirs;
  if (myVote === 'coop' && otherVote === 'coop') { mine = PAYOFFS.C; theirs = PAYOFFS.C; }
  else if (myVote === 'bet' && otherVote === 'coop') { mine = PAYOFFS.T; theirs = PAYOFFS.S; }
  else if (myVote === 'coop' && otherVote === 'bet') { mine = PAYOFFS.S; theirs = PAYOFFS.T; }
  else { mine = PAYOFFS.P; theirs = PAYOFFS.P; }
  return { mine: applyModifier(mine, mod), theirs: applyModifier(theirs, mod), mod };
}

// RESPALDOS: personalidades burocráticas. Se muestran con sello visible.
// Tope anti-granja: traicionar a un respaldo jamás paga más que cooperar con él.
export const SUBS = [
  { code: '91', name: 'Ventanilla Única', policy: 'Coopera siempre, por reglamento.', decide: () => 'coop' },
  { code: '92', name: 'Archivo Recíproco', policy: 'Devuelve tu última decisión.', decide: (h) => (h.length ? h[h.length - 1] : 'coop') },
  { code: '93', name: 'Delegado Intermitente', policy: 'Coopera 7 de cada 10 veces, sin explicación.', decide: () => (Math.random() < 0.7 ? 'coop' : 'bet') },
  { code: '94', name: 'Auditoría Reactiva', policy: 'Si desertas, te persigue.', decide: (h) => (h.length && h[h.length - 1] === 'bet' ? (Math.random() < 0.85 ? 'bet' : 'coop') : Math.random() < 0.7 ? 'coop' : 'bet') },
  { code: '95', name: 'Mesa Directiva', policy: 'Deserta por mandato expreso.', decide: () => 'bet' }
];

export function resolveSubstitute(myVote, roundNo, history = []) {
  const sub = SUBS[Math.min(SUBS.length, roundNo) - 1] || SUBS[SUBS.length - 1];
  const theirs = sub.decide(history);
  let mine, theirsS;
  if (myVote === 'coop' && theirs === 'coop') { mine = PAYOFFS.C; theirsS = PAYOFFS.C; }
  else if (myVote === 'bet' && theirs === 'coop') { mine = PAYOFFS.C; theirsS = PAYOFFS.S; } // tope anti-granja
  else if (myVote === 'coop' && theirs === 'bet') { mine = PAYOFFS.S; theirsS = PAYOFFS.T; }
  else { mine = PAYOFFS.P; theirsS = PAYOFFS.P; }
  const mod = MODIFIERS[roundNo - 1] || MODIFIERS[0];
  return { mine: applyModifier(mine, mod), theirs: applyModifier(theirsS, mod), sub, mod, theirVote: theirs };
}

// Resumen del curso, a partir de lo que reporta cada dispositivo.
export function classSummary(docs) {
  const list = Object.values(docs || {});
  const finished = list.filter((d) => d.state === 'finished');
  const playing = list.filter((d) => d.state === 'playing');
  const left = list.filter((d) => d.state === 'left');
  let votes = 0, coops = 0, subsResolved = 0, roundsResolved = 0, pool = 0;
  for (const d of finished) {
    pool += Number(d.score) || 0;
    for (const r of d.history || []) {
      roundsResolved++;
      if (r.vote === 'coop') coops++;
      if (r.vote) votes++;
      if (r.kind === 'substitute') subsResolved++;
    }
  }
  const f = finished.length;
  const { poolMax, threshold } = computeThreshold(f);
  const expected = Math.max(f + playing.length, f);
  const proj = computeThreshold(expected);
  return {
    finished: f, playing: playing.length, left: left.length, total: list.length,
    pool, poolMax, threshold,
    projectedThreshold: proj.threshold, projectedPoolMax: proj.poolMax,
    coopRate: votes ? coops / votes : 0,
    subRate: roundsResolved ? subsResolved / roundsResolved : 0,
    betrayed: Math.max(0, poolMax - pool),
    betrayalsLeft: Math.floor((threshold - pool) / COST_BETRAY),
    reach: threshold ? pool / threshold : 0,
    won: f > 0 && pool >= threshold
  };
}

export function fmtClock(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ---- Persistencia local (recargar, apagar el celular o perder el wifi) ----
const krun = (session) => `jda:v2:run:${session}`;
const kout = (session) => `jda:v2:outbox:${session}`;

export function saveRun(session, obj) {
  try { localStorage.setItem(krun(session), JSON.stringify(obj)); } catch (e) { /* sin storage: seguimos en memoria */ }
}
export function loadRun(session) {
  try {
    const raw = localStorage.getItem(krun(session));
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
export function clearRun(session) {
  try { localStorage.removeItem(krun(session)); } catch (e) {}
}

export function pushOutbox(session, item) {
  try {
    const q = JSON.parse(localStorage.getItem(kout(session)) || '[]');
    q.push({ ...item, at: Date.now() });
    localStorage.setItem(kout(session), JSON.stringify(q.slice(-60)));
  } catch (e) {}
}
export function readOutbox(session) {
  try { return JSON.parse(localStorage.getItem(kout(session)) || '[]'); } catch (e) { return []; }
}
export function writeOutbox(session, q) {
  try { localStorage.setItem(kout(session), JSON.stringify(q)); } catch (e) {}
}

export function exportResult(state) {
  const head = `El Protocolo de Austeridad v${GAME_VERSION}\nSesión: ${state.session}\nJugador: ${state.name} (${state.code})\n`;
  const rows = (state.history || []).map((r) =>
    `R${r.round} ${r.modName} | rival ${r.oppName} [${r.kind === 'substitute' ? 'RESPALDO' : 'HUMANO'}] | yo ${r.vote === 'coop' ? 'COOPERAR' : 'DESERTAR'} / rival ${r.oppVote === 'coop' ? 'COOPERAR' : 'DESERTAR'} | +${r.score}`);
  const tail = `\nTOTAL: ${state.score} / ${maxPerPlayer()} | Cooperaciones: ${state.coopCount}/${state.history?.length || 0} | Respaldo: ${state.subCount} veces\nUmbral de curso según quienes terminaron: ver panel del instructor.\n`;
  return head + rows.join('\n') + tail;
}

export function exportCsv(state) {
  const rows = [['ronda', 'regla', 'rival', 'tipo', 'mi_voto', 'voto_rival', 'puntos']];
  for (const r of state.history || []) rows.push([r.round, r.modName, r.oppName, r.kind, r.vote, r.oppVote, r.score]);
  return rows.map((c) => c.join(',')).join('\n');
}
