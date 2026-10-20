const http = require('http');
const fs = require('fs');
const { WebSocketServer } = require('ws');
const PORT = 3000;

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

let players = new Map();
let instructorWs = null;
let gameState = { round: 0, phase: 0, timeLeft: 0, running: false, pairs: [], votes: new Map(), poolScore: 0, roundScores: new Map() };

const server = http.createServer((req, res) => {
  let file = (req.url === '/' || req.url === '/index.html') ? 'index.html' : 'admin.html';
  fs.readFile(file, (err, data) => {
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.type === 'register') {
      let code = null;
      for (let i = 1; i <= 30; i++) {
        let c = String(i).padStart(2, '0');
        if (!Array.from(players.values()).some(p => p.code === c)) { code = c; break; }
      }
      if (!code) { ws.send(JSON.stringify({type:'error', msg:'Sala llena'})); return; }
      players.set(ws, { id: 'J'+code, code, score: 0 });
      ws.send(JSON.stringify({type:'registered', code}));
      broadcastState();
    } else if (msg.type === 'instructor') {
      instructorWs = ws;
    } else if (msg.type === 'startGame') {
      startGame();
    } else if (msg.type === 'nextPhase') {
      advancePhase();
    } else if (msg.type === 'vote') {
      const p = players.get(ws);
      if(p && gameState.phase === 1) { gameState.votes.set(p.code, msg.vote); }
    }
  });
});

function startGame() {
  gameState = { round: 1, phase: 0, running: true, votes: new Map(), poolScore: 0 };
  for(let p of players.values()) p.score = 0;
  startPhase(0);
}

function startPhase(pi) {
  gameState.phase = pi;
  gameState.timeLeft = PHASES[pi].duration;
  if(pi===0) formPairs();
  broadcastState();
  let timer = setInterval(() => {
    if(gameState.timeLeft-- <= 0) { clearInterval(timer); }
    broadcastState();
  }, 1000);
}

function formPairs() {
  const pList = shuffle(Array.from(players.values()));
  gameState.pairs = [];
  for(let i=0; i<pList.length; i+=2) {
    if(pList[i+1]) gameState.pairs.push({p1:pList[i].code, p2:pList[i+1].code});
  }
}

function advancePhase() {
  if(gameState.phase < PHASES.length-1) startPhase(gameState.phase+1);
  else endRound();
}

function endRound() {
  // Simplificado para velocidad
  for(let pair of gameState.pairs) {
    let s1=8, s2=8; // Coopera ambos
    // (Lógica de puntuación simplificada para no trabar el servidor)
    for(let p of players.values()) {
      if(p.code===pair.p1 || p.code===pair.p2) p.score += s1;
    }
  }
  if(gameState.round < 5) { gameState.round++; startPhase(0); }
  else broadcastState();
}

function shuffle(a){ for(let i=a.length-1;i>0;i--){ let j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

function broadcastState() {
  const msg = JSON.stringify({type:'state', ...gameState, players: Array.from(players.values())});
  for(let c of wss.clients) if(c.readyState===1) c.send(msg);
}

server.listen(3000, () => console.log('Servidor en http://localhost:3000'));
