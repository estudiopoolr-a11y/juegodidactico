import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, updateDoc, collection, query, orderBy, limit, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// CONFIGURACIÓN DE FIREBASE (reemplazar con tu propia config)
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT_ID.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT_ID.appspot.com",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- GAME CONFIG (Shared with server logic if a server was used) ---
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

// --- FIREBASE DB FUNCTIONS ---
const GameDB = {
  async createGame(gameCode) {
    const gameRef = doc(db, 'games', gameCode);
    const gameDoc = await getDoc(gameRef);
    if (gameDoc.exists()) {
      throw new Error('El código de juego ya existe. Por favor, elige otro.');
    }
    await setDoc(gameRef, {
      gameCode,
      round: 0,
      phase: -1, // -1 means game not started yet, 0 is negotiation
      timeLeft: 0,
      running: false,
      players: {},
      votes: {},
      pairs: [],
      poolScore: 0,
      createdAt: serverTimestamp()
    });
  },

  subscribeToGame(gameCode, callback) {
    return onSnapshot(doc(db, 'games', gameCode), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      } else {
        callback(null); // Game does not exist
      }
    }, (error) => {
      console.error("Error subscribing to game:", error);
      callback(null); // Handle error case gracefully
    });
  },

  async joinGame(gameCode, playerCode, playerName) {
    const gameRef = doc(db, 'games', gameCode);
    const gameDoc = await getDoc(gameRef);

    if (!gameDoc.exists()) {
      throw new Error('El juego no encontrado. Verifica el código.');
    }

    const game = gameDoc.data();
    // Check if player code is already taken in this game
    if (game.players[playerCode] && game.players[playerCode].name !== playerName) {
      throw new Error(`El código de jugador ${playerCode} ya está ocupado.`);
    }

    await updateDoc(gameRef, {
      [`players.${playerCode}`]: {
        code: playerCode,
        name: playerName,
        score: 0,
        vote: null,
        partnerId: null,
        isConnected: true // Track player's connection status
      }
    });
  },
  
  async disconnectPlayer(gameCode, playerCode) {
    const gameRef = doc(db, 'games', gameCode);
    await updateDoc(gameRef, { [`players.${playerCode}.isConnected`]: false });
  },

  async startGame(gameCode, connectedPlayerCount) {
    const gameRef = doc(db, 'games', gameCode);
    const gameDoc = await getDoc(gameRef);
    const game = gameDoc.data();

    if (game.running) throw new Error('El juego ya está en curso.');
    if (connectedPlayerCount < 2) throw new Error('Necesitas al menos 2 jugadores para empezar.');
    // if (connectedPlayerCount < 30) { 
    //   alert(`Advertencia: Hay ${connectedPlayerCount} jugadores. Se recomienda 30 para la experiencia completa.`);
    // } // This alert logic should be in admin.html

    await updateDoc(gameRef, {
      round: 1,
      phase: 0, // Negotiation
      timeLeft: PHASES[0].duration,
      running: true,
      poolScore: 0,
      votes: {},
      pairs: []
    });
    // Reset scores for all players
    const playerUpdates = {};
    for(const code in game.players) {
      playerUpdates[`players.${code}.score`] = 0;
      playerUpdates[`players.${code}.vote`] = null;
      playerUpdates[`players.${code}.partnerId`] = null;
    }
    await updateDoc(gameRef, playerUpdates);
    this.formPairs(gameCode);
    this.startTimer(gameCode);
  },

  async nextPhase(gameCode) {
    const gameRef = doc(db, 'games', gameCode);
    const gameDoc = await getDoc(gameRef);
    const game = gameDoc.data();

    if (!game.running) return; // Only advance if game is running

    // If timer ran out in results phase, it's end of round/game
    if (game.phase === PHASES.length - 1) { // Current phase is RESULTS
      if (game.round < TOTAL_ROUNDS) {
        await updateDoc(gameRef, {
          round: game.round + 1,
          phase: 0,
          timeLeft: PHASES[0].duration,
          votes: {}
        });
        this.formPairs(gameCode);
        this.startTimer(gameCode);
      } else { // End of game
        await updateDoc(gameRef, { running: false, timeLeft: 0 });
      }
    } else { // Advance to next phase in current round
      await updateDoc(gameRef, {
        phase: game.phase + 1,
        timeLeft: PHASES[game.phase + 1].duration
      });
      if (game.phase + 1 === 1) { // Entering voting phase, clear previous votes
        await updateDoc(gameRef, { votes: {} });
        for(const code in game.players) {
          await updateDoc(gameRef, {[`players.${code}.vote`]: null});
        }
      }
      this.startTimer(gameCode);
    }
  },

  async startTimer(gameCode) {
    // Timer logic on client side for display, actual game state change from admin
    // This function will be triggered by admin to just start countdown
  },
  
  // This function would typically run on a server or a trusted environment (e.g., Firebase Cloud Functions)
  // For simplicity, we'll run it from admin, but it's prone to manipulation or network issues if admin closes
  async updateGameTimer(gameCode) {
    const gameRef = doc(db, 'games', gameCode);
    const gameDoc = await getDoc(gameRef);
    const game = gameDoc.data();

    if (game.running && game.timeLeft > 0) {
      await updateDoc(gameRef, { timeLeft: game.timeLeft - 1 });
    } else if (game.running && game.timeLeft <= 0) {
      // Time's up for current phase, auto-advance or calculate scores
      if (game.phase === 1) { // Voting phase ended
        await this.calculateScores(gameCode);
      } else if (game.phase === PHASES.length - 1) { // Results phase ended
        // Auto-advance to next round/end game is handled by nextPhase
      }
      // For other phases, just advance (negotiation, audit)
      if (game.phase !== 1) { // Voting phase score calculation is special
        this.nextPhase(gameCode); // Advance if timer runs out
      }
    }
  },

  async formPairs(gameCode) {
    const gameRef = doc(db, 'games', gameCode);
    const gameDoc = await getDoc(gameRef);
    const game = gameDoc.data();
    const playerList = Object.values(game.players).filter(p => p.isConnected); // Only connected players
    const shuffledPlayers = [...playerList].sort(() => Math.random() - 0.5);

    const pairs = [];
    const playerUpdates = {};
    for (let i = 0; i < shuffledPlayers.length; i += 2) {
      if (shuffledPlayers[i + 1]) {
        const p1 = shuffledPlayers[i];
        const p2 = shuffledPlayers[i + 1];
        pairs.push({ p1: p1.code, p2: p2.code });
        playerUpdates[`players.${p1.code}.partnerId`] = p2.code;
        playerUpdates[`players.${p2.code}.partnerId`] = p1.code;
      } else {
        // Handle odd number of players (e.g., assign to instructor or special role)
        // For now, odd player gets no partner, or can be paired with an AI (future)
        playerUpdates[`players.${shuffledPlayers[i].code}.partnerId`] = null; 
      }
    }
    await updateDoc(gameRef, { pairs: pairs, ...playerUpdates });
  },

  async calculateScores(gameCode) {
    const gameRef = doc(db, 'games', gameCode);
    const gameDoc = await getDoc(gameRef);
    const game = gameDoc.data();
    
    const rules = ROUND_RULES[game.round - 1];
    const updates = {};
    let currentPoolScore = game.poolScore || 0;

    for (const pair of game.pairs) {
      const p1Vote = game.votes[pair.p1] || 'coop'; // Default to cooperate if no vote
      const p2Vote = game.votes[pair.p2] || 'coop'; // Default to cooperate if no vote

      let s1 = 0, s2 = 0;
      if (p1Vote === 'coop' && p2Vote === 'coop') { s1=rules.coopBonus; s2=rules.coopBonus; }
      else if (p1Vote === 'bet' && p2Vote === 'coop') { s1=rules.betrayGain; s2=rules.betrayLoss; }
      else if (p1Vote === 'coop' && p2Vote === 'bet') { s1=rules.betrayLoss; s2=rules.betrayGain; }
      else { s1=rules.bothBetray; s2=rules.bothBetray; }

      if (rules.tax > 0) { s1 = Math.floor(s1 * (1 - rules.tax)); s2 = Math.floor(s2 * (1 - rules.tax)); }
      if (rules.multiplier !== 1) { s1 = Math.floor(s1 * rules.multiplier); s2 = Math.floor(s2 * rules.multiplier); }
      
      // Update individual player scores
      if (game.players[pair.p1]) updates[`players.${pair.p1}.score`] = (game.players[pair.p1].score || 0) + s1;
      if (game.players[pair.p2]) updates[`players.${pair.p2}.score`] = (game.players[pair.p2].score || 0) + s2;

      currentPoolScore += s1 + s2; // Add to pool
    }
    
    updates.poolScore = currentPoolScore; // Update total pool score
    await updateDoc(gameRef, updates);
    this.nextPhase(gameCode); // Automatically advance after calculating scores
  },

  async submitVote(gameCode, playerCode, vote) {
    const gameRef = doc(db, 'games', gameCode);
    await updateDoc(gameRef, { 
      [`players.${playerCode}.vote`]: vote,
      [`votes.${playerCode}`]: vote // Also store in root votes for easy lookup
    });
  },

  // --- CHAT FUNCTIONS ---
  async sendChatMessage(gameCode, fromPlayerCode, toPlayerCode, message) {
    const chatCollectionRef = collection(db, 'games', gameCode, 'chat');
    await addDoc(chatCollectionRef, {
      from: fromPlayerCode,
      to: toPlayerCode,
      message: message,
      timestamp: serverTimestamp()
    });
  },

  subscribeToChat(gameCode, playerCode, callback) {
    const chatCollectionRef = collection(db, 'games', gameCode, 'chat');
    const q = query(chatCollectionRef, orderBy('timestamp', 'asc'));
    
    // Filter messages relevant to this player (from them or to them)
    return onSnapshot(q, (snapshot) => {
      const messages = [];
      snapshot.forEach(doc => {
        const msg = doc.data();
        if (msg.from === playerCode || msg.to === playerCode) {
          messages.push(msg);
        }
      });
      callback(messages);
    });
  },

  subscribeToAllChat(gameCode, callback) {
    const chatCollectionRef = collection(db, 'games', gameCode, 'chat');
    const q = query(chatCollectionRef, orderBy('timestamp', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
      const messages = [];
      snapshot.forEach(doc => messages.push(doc.data()));
      callback(messages);
    });
  }
};

export { GameDB, PHASES, TOTAL_ROUNDS, VICTORY_THRESHOLD, ROUND_RULES };
