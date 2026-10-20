import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, updateDoc, collection, query, orderBy, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyC87SH04-yreSbktKFoE72THQXkiCIBx-Y",
  authDomain: "juegodidactico-298f8.firebaseapp.com",
  projectId: "juegodidactico-298f8",
  storageBucket: "juegodidactico-298f8.firebasestorage.app",
  messagingSenderId: "570215721083",
  appId: "1:570215721083:web:6e2adfd68e2ec450259ade"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ROUND_RULES = [
  { name: 'Estándar', coopBonus: 8, betrayGain: 25, betrayLoss: -15, bothBetray: 2, tax: 0, multiplier: 1 },
  { name: 'Estándar', coopBonus: 8, betrayGain: 25, betrayLoss: -15, bothBetray: 2, tax: 0, multiplier: 1 },
  { name: 'Impuesto 10%', coopBonus: 8, betrayGain: 25, betrayLoss: -15, bothBetray: 2, tax: 0.10, multiplier: 1 },
  { name: 'Impuesto 10%', coopBonus: 8, betrayGain: 25, betrayLoss: -15, bothBetray: 2, tax: 0.10, multiplier: 1 },
  { name: 'Impuesto 20% + 0.9x', coopBonus: 8, betrayGain: 25, betrayLoss: -15, bothBetray: 2, tax: 0.20, multiplier: 0.9 }
];

const PHASES = [
  { id: 'negociacion', name: 'NEGOCIACIÓN', duration: 45 },
  { id: 'votacion', name: 'VOTACIÓN', duration: 45 },
  { id: 'auditoria', name: 'AUDITORÍA', duration: 30 },
  { id: 'resultados', name: 'RESULTADOS', duration: 60 }
];

const TOTAL_ROUNDS = 5;
const VICTORY_THRESHOLD = 1000;

const GameDB = {
  async createGame(gameCode) {
    const gameRef = doc(db, 'games', gameCode);
    await setDoc(gameRef, { gameCode, round: 0, phase: -1, timeLeft: 0, running: false, players: {}, votes: {}, pairs: [], poolScore: 0, createdAt: serverTimestamp() });
  },

  subscribeToGame(gameCode, callback) {
    return onSnapshot(doc(db, 'games', gameCode), (docSnap) => callback(docSnap.exists() ? docSnap.data() : null));
  },

  async joinGame(gameCode, playerCode, playerName) {
    const gameRef = doc(db, 'games', gameCode);
    const gameDoc = await getDoc(gameRef);
    if (!gameDoc.exists()) throw new Error('Juego no encontrado.');
    await updateDoc(gameRef, { [`players.${playerCode}`]: { code: playerCode, name: playerName, score: 0, vote: null, partnerId: null, isConnected: true } });
  },

  async startGame(gameCode) {
    const gameRef = doc(db, 'games', gameCode);
    await updateDoc(gameRef, { round: 1, phase: 0, timeLeft: PHASES[0].duration, running: true, poolScore: 0 });
    this.formPairs(gameCode);
  },

  async nextPhase(gameCode) {
    const gameRef = doc(db, 'games', gameCode);
    const gameDoc = await getDoc(gameRef);
    const game = gameDoc.data();
    if (game.phase === PHASES.length - 1) {
      if (game.round < TOTAL_ROUNDS) {
        await updateDoc(gameRef, { round: game.round + 1, phase: 0, timeLeft: PHASES[0].duration, votes: {} });
        this.formPairs(gameCode);
      } else { await updateDoc(gameRef, { running: false, timeLeft: 0 }); }
    } else {
      await updateDoc(gameRef, { phase: game.phase + 1, timeLeft: PHASES[game.phase + 1].duration });
      if (game.phase + 1 === 1) await updateDoc(gameRef, { votes: {} });
    }
  },

  async formPairs(gameCode) {
    const gameRef = doc(db, 'games', gameCode);
    const game = (await getDoc(gameRef)).data();
    const pCodes = Object.keys(game.players);
    const shuffled = [...pCodes].sort(() => Math.random() - 0.5);
    const pairs = [];
    const updates = {};
    for (let i = 0; i < shuffled.length; i += 2) {
      if (shuffled[i+1]) {
        pairs.push({ p1: shuffled[i], p2: shuffled[i+1] });
        updates[`players.${shuffled[i]}.partnerId`] = shuffled[i+1];
        updates[`players.${shuffled[i+1]}.partnerId`] = shuffled[i];
      }
    }
    await updateDoc(gameRef, { pairs, ...updates });
  },

  async submitVote(gameCode, playerCode, vote) {
    await updateDoc(doc(db, 'games', gameCode), { [`players.${playerCode}.vote`]: vote, [`votes.${playerCode}`]: vote });
  },

  async sendChatMessage(gameCode, from, to, message) {
    await addDoc(collection(db, 'games', gameCode, 'chat'), { from, to, message, timestamp: serverTimestamp() });
  },

  subscribeToChat(gameCode, playerCode, callback) {
    return onSnapshot(query(collection(db, 'games', gameCode, 'chat'), orderBy('timestamp', 'asc')), (snap) => {
      const msgs = [];
      snap.forEach(d => { const m = d.data(); if (m.from === playerCode || m.to === playerCode) msgs.push(m); });
      callback(msgs);
    });
  },

  subscribeToAllChat(gameCode, callback) {
    return onSnapshot(query(collection(db, 'games', gameCode, 'chat'), orderBy('timestamp', 'asc')), (snap) => {
      const msgs = []; snap.forEach(d => msgs.push(d.data())); callback(msgs);
    });
  }
};

export { GameDB };
