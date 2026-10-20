import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, updateDoc, collection, query, orderBy, limit, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

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
    const gameDoc = await getDoc(gameRef);
    if (gameDoc.exists()) throw new Error('El código de juego ya existe.');
    await setDoc(gameRef, {
      gameCode, round: 0, phase: -1, timeLeft: 0, running: false,
      players: {}, votes: {}, pairs: [], poolScore: 0, createdAt: serverTimestamp()
    });
  },

  subscribeToGame(gameCode, callback) {
    return onSnapshot(doc(db, 'games', gameCode), (docSnap) => {
      callback(docSnap.exists() ? docSnap.data() : null);
    }, (error) => { console.error("Error subscribing:", error); callback(null); });
  },

  async joinGame(gameCode, playerCode, playerName) {
    const gameRef = doc(db, 'games', gameCode);
    const gameDoc = await getDoc(gameRef);
    if (!gameDoc.exists()) throw new Error('El juego no encontrado.');
    const game = gameDoc.data();
    if (game.players[playerCode] && game.players[playerCode].name !== playerName) {
      throw new Error(`El código ${playerCode} ya está ocupado.`);
    }
    await updateDoc(gameRef, { [`players.${playerCode}`]: { code: playerCode, name: playerName, score: 0, vote: null, partnerId: null, isConnected: true } });
  },

  async startGame(gameCode, connectedCount) {
    const gameRef = doc(db, 'games', gameCode);
    const gameDoc = await getDoc(gameRef);
    const game = gameDoc.data();
    if (game.running) throw new Error('Ya está corriendo.');
    if (connectedCount < 2) throw new Error('Necesitas al menos 2 jugadores.');
    await updateDoc(gameRef, { round: 1, phase: 0, timeLeft: PHASES[0].duration, running: true, poolScore: 0, votes: {}, pairs: [] });
    const playerUpdates = {};
    for(const code in game.players) playerUpdates[`players.${code}.score`] = 0;
    await updateDoc(gameRef, playerUpdates);
    this.formPairs(gameCode);
  },

  async nextPhase(gameCode) {
    const gameRef = doc(db, 'games', gameCode);
    const gameDoc = await getDoc(gameRef);
    const game = gameDoc.data();
    if (!game.running) return;
    if (game.phase === PHASES.length - 1) {
      if (game.round < TOTAL_ROUNDS) {
        await updateDoc(gameRef, { round: game.round + 1, phase: 0, timeLeft: PHASES[0].duration, votes: {} });
        this.formPairs(gameCode);
      } else { await updateDoc(gameRef, { running: false, timeLeft: 0 }); }
    } else {
      await updateDoc(gameRef, { phase: game.phase + 1, timeLeft: PHASES[game.phase + 1].duration });
      if (game.phase + 1 === 1) { await updateDoc(gameRef, { votes: {} }); for(const code in game.players) await updateDoc(gameRef, {[`players.${code}.vote`]: null}); }
    }
  },

  async calculateScores(gameCode) {
    const gameRef = doc(db, 'games', gameCode);
    const gameDoc = await getDoc(gameRef);
    const game = gameDoc.data();
    const rules = ROUND_RULES[game.round - 1];
    const updates = {};
    let currentPoolScore = game.poolScore || 0;

    for (const pair of game.pairs) {
      const p1Vote = game.votes[pair.p1] || 'coop';
      const p2Vote = game.votes[pair.p2] || 'coop';
      let s1 = 0, s2 = 0;
      if (p1Vote === 'coop' && p2Vote === 'coop') { s1=rules.coopBonus; s2=rules.coopBonus; }
      else if (p1Vote === 'bet' && p2Vote === 'coop') { s1=rules.betrayGain; s2=rules.betrayLoss; }
      else if (p1Vote === 'coop' && p2Vote === 'bet') { s1=rules.betrayLoss; s2=rules.betrayGain; }
      else { s1=rules.bothBetray; s2=rules.bothBetray; }
      if (rules.tax > 0) { s1 = Math.floor(s1 * (1 - rules.tax)); s2 = Math.floor(s2 * (1 - rules.tax)); }
      if (rules.multiplier !== 1) { s1 = Math.floor(s1 * rules.multiplier); s2 = Math.floor(s2 * rules.multiplier); }
      if (game.players[pair.p1]) updates[`players.${pair.p1}.score`] = (game.players[pair.p1].score || 0) + s1;
      if (game.players[pair.p2]) updates[`players.${pair.p2}.score`] = (game.players[pair.p2].score || 0) + s2;
      currentPoolScore += s1 + s2;
    }
    updates.poolScore = currentPoolScore;
    await updateDoc(gameRef, updates);
    await this.nextPhase(gameCode);
  },

  async submitVote(gameCode, playerCode, vote) {
    const gameRef = doc(db, 'games', gameCode);
    await updateDoc(gameRef, { [`players.${playerCode}.vote`]: vote, [`votes.${playerCode}`]: vote });
  },

  formPairs(gameCode) {
    const gameRef = doc(db, 'games', gameCode);
    const gameDoc = getDoc(gameRef).then(doc => doc.data());
    const playerList = Object.values(game.players || {}).filter(p => p.isConnected);
    const shuffledPlayers = [...playerList].sort(() => Math.random() - 0.5);
    const pairs = [];
    const playerUpdates = {};
    for (let i = 0; i < shuffledPlayers.length; i += 2) {
      if (shuffledPlayers[i + 1]) {
        const p1 = shuffledPlayers[i]; const p2 = shuffledPlayers[i + 1];
        pairs.push({ p1: p1.code, p2: p2.code });
        playerUpdates[`players.${p1.code}.partnerId`] = p2.code;
        playerUpdates[`players.${p2.code}.partnerId`] = p1.code;
      } else { playerUpdates[`players.${shuffledPlayers[i].code}.partnerId`] = null; }
    }
    gameRef.update({ pairs: pairs, ...playerUpdates });
  },

  async sendChatMessage(gameCode, fromPlayerCode, toPlayerCode, message) {
    const chatCollectionRef = collection(db, 'games', gameCode, 'chat');
    await addDoc(chatCollectionRef, { from: fromPlayerCode, to: toPlayerCode, message: message, timestamp: serverTimestamp() });
  },

  subscribeToChat(gameCode, playerCode, callback) {
    const q = query(collection(db, 'games', gameCode, 'chat'), orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const messages = [];
      snapshot.forEach(doc => { const msg = doc.data(); if (msg.from === playerCode || msg.to === playerCode) messages.push(msg); });
      callback(messages);
    });
  },

  subscribeToAllChat(gameCode, callback) {
    const q = query(collection(db, 'games', gameCode, 'chat'), orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snapshot) => { const messages = []; snapshot.forEach(doc => messages.push(doc.data())); callback(messages); });
  }
};

export { GameDB, PHASES, TOTAL_ROUNDS, VICTORY_THRESHOLD, ROUND_RULES };
