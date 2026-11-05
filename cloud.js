// cloud.js — La nube como teléfono, no como semáforo.
// Nada de lo que ocurre aquí bloquea la partida: si falla, asumimos RESPALDO,
// seguimos jugando y guardamos el reporte en cola para reintentar después.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import {
  getFirestore, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot,
  collection, query, where, runTransaction, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

import { GAME_VERSION, ROUND_BUDGET_S, MATCH_WINDOW_S, ABSTENTION_S, classSummary } from './engine.js';

const firebaseConfig = {
  apiKey: "AIzaSyC87SH04-yreSbktKFoE72THQXkiCIBx-Y",
  authDomain: "juegodidactico-298f8.firebaseapp.com",
  projectId: "juegodidactico-298f8",
  storageBucket: "juegodidactico-298f8.firebasestorage.app",
  messagingSenderId: "570215721083",
  appId: "1:570215721083:web:6e2adfd68e2ec450259ade"
};

let db = null;
try {
  db = getFirestore(initializeApp(firebaseConfig));
} catch (e) {
  console.warn('Sin Firebase: modo aislado. La partida se juega igual y se reporta después.', e);
}

export const online = () => !!db;
const g = (session, ...p) => doc(db, 'games', session, ...p);
const runnerRef = (session, code) => g(session, 'runners', code);
const slotRef = (session, nn) => g(session, 'slots', nn);
// Clave determinista: la misma pareja produce el mismo id sin importar quién mira.
const offerRef = (session, round, a, b) => g(session, 'offers', `r${round}-${[a, b].sort().join('~')}`);

export async function createSession(session, teacher) {
  if (!db) return false;
  try {
    await setDoc(g(session), { session, teacher: teacher || 'Instructor', version: GAME_VERSION, closed: false, createdAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (e) { console.warn(e); return false; }
}

export async function readSession(session) {
  if (!db) return null;
  try { const s = await getDoc(g(session)); return s.exists() ? s.data() : null; } catch (e) { return null; }
}

// ---- Código: el primero libre, y nunca depende de la red ----
export async function claimCode(session, name) {
  if (!db) return { code: 'P' + Math.floor(1000 + Math.random() * 9000), isolated: true };
  try {
    for (let i = 1; i <= 30; i++) {
      const nn = String(i).padStart(2, '0');
      const res = await runTransaction(db, async (t) => {
        const cur = await t.get(slotRef(session, nn));
        if (cur.exists()) return 'taken';
        t.set(slotRef(session, nn), { nn, name, at: serverTimestamp() });
        return nn;
      });
      if (res === nn) return { code: nn, isolated: false };
    }
    return { code: 'X' + Math.floor(100 + Math.random() * 900), overflow: true };
  } catch (e) {
    console.warn('No pude tomar código, sigo aislado.', e);
    return { code: 'P' + Math.floor(1000 + Math.random() * 9000), isolated: true };
  }
}

// ---- Latido: estado vivo del jugador (nunca bloquea) ----
export async function heartbeat(session, payload) {
  if (!db || payload.isolated) return false;
  try {
    await setDoc(runnerRef(session, payload.code), { ...payload, beat: Date.now(), updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (e) { return false; }
}

// ---- Emparejamiento diferido ----
// Regla anti-carrera: sólo el que llegó ANTES reclama al que llegó después.
// Así dos dispositivos nunca redactan el mismo duelo y no hace falta un orquestador.
export function seekOpponent(session, me, round, handlers) {
  if (!db || me.isolated) { const t = setTimeout(() => handlers.onAlone(), 250); return () => clearTimeout(t); }

  const wantAt = Date.now();
  setDoc(runnerRef(session, me.code), {
    code: me.code, name: me.name, round, state: 'matching', wantAt, beat: wantAt,
    score: me.score || 0, updatedAt: serverTimestamp()
  }, { merge: true }).catch(() => {});

  let stopped = false;
  const stop = () => { stopped = true; };

  // a) Escucho ofertas donde ya me metieron (el otro llegó antes que yo).
  const unIn = onSnapshot(query(collection(db, 'games', session, 'offers'), where('round', '==', round)), (snap) => {
    if (stopped) return;
    for (const d of snap.docs) {
      const o = d.data();
      if (o.a !== me.code && o.b !== me.code) continue;
      const otherCode = o.a === me.code ? o.b : o.a;
      const otherName = o.a === me.code ? o.bName : o.aName;
      stop(); unIn(); unPoll();
      setDoc(runnerRef(session, me.code), { state: 'matched', pairedWith: otherCode }, { merge: true }).catch(() => {});
      handlers.onPaired({ ref: d.ref, code: otherCode, name: otherName || 'Homólogo' });
      return;
    }
  }, () => {});

  // b) Reclamo: busco al más antiguo entre los que llegaron después que yo.
  const iv = setInterval(async () => {
    if (stopped) { clearInterval(iv); return; }
    if (Date.now() - wantAt > MATCH_WINDOW_S * 1000) {
      stop(); unIn(); clearInterval(iv);
      setDoc(runnerRef(session, me.code), { state: 'matching', round }, { merge: true }).catch(() => {});
      handlers.onAlone();
      return;
    }
    let snap;
    try { snap = await getDocs(query(collection(db, 'games', session, 'runners'), where('round', '==', round))); }
    catch (e) { return; }
    const cands = snap.docs.map((d) => d.data()).filter((r) =>
      r && r.code !== me.code && r.state === 'matching' && r.wantAt > wantAt &&
      Date.now() - (r.beat || 0) < 20000);
    if (!cands.length) return;
    cands.sort((x, y) => x.wantAt - y.wantAt);
    const other = cands[0];
    const ref = offerRef(session, round, me.code, other.code);
    try {
      await runTransaction(db, async (t) => {
        if ((await t.get(ref)).exists()) return;
        t.set(ref, {
          round, a: me.code, b: other.code, aName: me.name, bName: other.name,
          aVote: null, bVote: null, aAt: null, bAt: null,
          chat: [], createdAt: serverTimestamp()
        });
      });
    } catch (e) { /* reintento en el siguiente tick */ }
  }, 700);
  const unPoll = () => clearInterval(iv);

  return () => { stop(); unIn(); unPoll(); };
}

// Voto sobre el duelo emparejado. Escribe sólo mi lado; el otro lado es ajeno.
export async function submitVote(ref, myCode, vote) {
  if (!db) return false;
  const side = await readSide(ref, myCode);
  if (!side) return false;
  try {
    await updateDoc(ref, side === 'a' ? { aVote: vote, aAt: Date.now() } : { bVote: vote, bAt: Date.now() });
    return true;
  } catch (e) { return false; }
}

async function readSide(ref, myCode) {
  try {
    const s = await getDoc(ref);
    if (!s.exists()) return null;
    const o = s.data();
    return o.a === myCode ? 'a' : o.b === myCode ? 'b' : null;
  } catch (e) { return null; }
}

export async function sendChat(ref, myCode, text) {
  if (!db) return false;
  try {
    const s = await getDoc(ref);
    if (!s.exists()) return false;
    const o = s.data();
    const chat = [...(o.chat || []), { from: myCode, text: String(text).slice(0, 120), at: Date.now() }];
    await updateDoc(ref, { chat: chat.slice(-12) });
    return true;
  } catch (e) { return false; }
}

export function watchOffer(ref, myCode, handlers) {
  if (!db) return () => {};
  return onSnapshot(ref, (s) => {
    if (!s.exists()) return;
    const o = s.data();
    const otherCode = o.a === myCode ? o.b : o.a;
    const otherName = o.a === myCode ? o.bName : o.aName;
    const myVote = o.a === myCode ? o.aVote : o.bVote;
    const otherVote = o.a === myCode ? o.bVote : o.aVote;
    const myAt = o.a === myCode ? o.aAt : o.bAt;
    handlers.onState({
      myVote, otherVote, otherCode, otherName: otherName || 'Homólogo',
      chat: (o.chat || []).filter((m) => m.from !== myCode)
    });
    // Abstención: voté y nadie respondió → el duelo se resuelve contra respaldo.
    if (myVote && !otherVote && myAt && Date.now() - myAt > ABSTENTION_S * 1000) {
      handlers.onAbstention?.(otherCode);
    }
  }, () => {});
}

export async function markResolved(session, code, round) {
  if (!db) return;
  try { await setDoc(runnerRef(session, code), { state: 'matching', round, resolvedRound: round }, { merge: true }); } catch (e) {}
}

// ---- Reporte final + cola offline ----
export async function reportFinal(session, payload) {
  if (!db || payload.isolated) return false;
  try {
    await setDoc(runnerRef(session, payload.code), { ...payload, beat: Date.now(), state: 'finished', finishedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (e) { return false; }
}

export async function queueReport(session, payload) {
  const { readOutbox, writeOutbox } = await import('./engine.js');
  const q = readOutbox(session);
  q.push(payload);
  writeOutbox(session, q.slice(-60));
}

export async function flushOutbox(session) {
  if (!db) return 0;
  const { readOutbox, writeOutbox } = await import('./engine.js');
  const q = readOutbox(session);
  if (!q.length) return 0;
  const failed = [];
  for (const item of q) {
    try { await setDoc(runnerRef(session, item.code), { ...item, replayed: true, beat: Date.now() }, { merge: true }); }
    catch (e) { failed.push(item); }
  }
  writeOutbox(session, failed);
  return q.length - failed.length;
}

export function startFlusher(session, everyMs = 20000) {
  flushOutbox(session);
  const iv = setInterval(() => flushOutbox(session), everyMs);
  window.addEventListener('online', () => flushOutbox(session));
  return () => clearInterval(iv);
}

// ---- Monitor del instructor ----
export function observeSession(session, cb, onError) {
  if (!db) { cb({ isolated: true, docs: {}, summary: classSummary({}) }); return () => {}; }
  return onSnapshot(collection(db, 'games', session, 'runners'), (snap) => {
    const docs = {};
    snap.forEach((d) => { docs[d.id] = d.data(); });
    cb({ docs, summary: classSummary(docs) });
  }, (e) => onError?.(e));
}

export async function closeSession(session) {
  if (!db) return false;
  try { await updateDoc(g(session), { closed: true, closedAt: serverTimestamp() }); return true; }
  catch (e) { return false; }
}

export async function purgeSession(session) {
  if (!db) return false;
  try {
    for (const coll of ['runners', 'offers', 'slots']) {
      const snap = await getDocs(collection(db, 'games', session, coll));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    }
    await deleteDoc(g(session));
    return true;
  } catch (e) { console.warn(e); return false; }
}

export const meta = { version: GAME_VERSION, roundBudget: ROUND_BUDGET_S };
