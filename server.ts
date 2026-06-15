import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { createInitialState, gameLoopStep, applyAction, FACTION_INFO } from './src/engine.js';
import { GameState, ClientMessage, PlayerAction } from './src/types.js';
import { encode } from '@msgpack/msgpack';

async function startServer() {
const app = express();
const PORT = 3000;

// Http Server holding Express app
const server = http.createServer(app);

// WebSocket Server holding HTTP Server
const wss = new WebSocketServer({ noServer: true });

// Store active games and player sockets (mapped by Lobby ID)
const games = new Map<string, GameState>();

interface SourcedClient {
ws: WebSocket;
team: 1 | 2 | 3 | 4 | 'spectator';
playerName: string;
}
const lobbyClients = new Map<string, Set<SourcedClient>>();

// Store active loops and known unit IDs per lobby to implement delta RTS compression and 24Hz tick rate
const lobbyLoops = new Map<string, NodeJS.Timeout>();
const lobbyKnownUnitIds = new Map<string, Set<string>>();

function buildDeltaPacket(lobbyId: string, state: GameState) {
if (!lobbyKnownUnitIds.has(lobbyId)) {
lobbyKnownUnitIds.set(lobbyId, new Set());
}
const knownIds = lobbyKnownUnitIds.get(lobbyId)!;

const spawns: any[] = [];
const updates: [string, number, number, number, string, string | null][] = [];
const deletes: string[] = [];

// Detect spawns and updates
const currentUnitIds = new Set<string>();
state.units.forEach(u => {
currentUnitIds.add(u.id);
if (!knownIds.has(u.id)) {
spawns.push(u);
knownIds.add(u.id);
} else {
updates.push([
u.id, 
Math.round(u.x), 
Math.round(u.y), 
Math.round(u.hp), 
u.state, 
u.targetId
]);
}
});

// Detect deletes
knownIds.forEach(id => {
if (!currentUnitIds.has(id)) {
deletes.push(id);
knownIds.delete(id);
}
});

// Build compact players map to minimize properties
const playersMap: any = {};
const teamsList: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
teamsList.forEach(t => {
const p = state.players[t];
if (p) {
playersMap[t] = {
gold: Math.round(p.gold),
mana: Math.round(p.mana),
income: p.income,
incomeUpgradeCost: p.incomeUpgradeCost,
barracksLevel: p.barracksLevel,
summonCooldown: p.summonCooldown,
heroSummoned: p.heroSummoned,
heroCooldown: p.heroCooldown,
ultimateResearched: p.ultimateResearched,
research: p.research,
name: p.name,
race: p.race,
raceLocked: p.raceLocked
};
} else {
playersMap[t] = null;
}
});

// Tower stats (towers are static, so we only need to sync health, level, and target)
const towerUpdates = state.towers.map(t => ({
id: t.id,
hp: Math.round(t.hp),
maxHp: t.maxHp,
level: t.level,
atk: t.atk,
range: t.range,
targetId: t.targetId
}));

return {
type: 'delta_update',
gameTime: state.gameTime,
waveTimer: state.waveTimer,
maxWaveTimer: state.maxWaveTimer,
status: state.status,
gameMode: state.gameMode,
winnerTeam: state.winnerTeam,
isAiEnabled: state.isAiEnabled,
players: playersMap,
spawns: spawns.length > 0 ? spawns : undefined,
updates: updates,
deletes: deletes.length > 0 ? deletes : undefined,
towers: towerUpdates,
projectiles: state.projectiles,
effects: state.effects,
floatingTexts: state.floatingTexts,
settings: state.settings,
neutralBuildings: state.neutralBuildings
};
}

function startLobbyGameLoop(lobbyId: string) {
if (lobbyLoops.has(lobbyId)) return;

const TICK_RATE = 24;
const TICK_INTERVAL_MS = 1000 / TICK_RATE; // ~41.67ms
const DT_SPEED = 60 / TICK_RATE; // 2.5 multiplier because our engine constants are written for 60Hz

const loop = setInterval(() => {
const state = games.get(lobbyId);
if (!state) {
clearInterval(loop);
lobbyLoops.delete(lobbyId);
lobbyKnownUnitIds.delete(lobbyId);
return;
}

if (state.status === 'playing') {
let simulationMult = 1.0;
if (state.settings && state.settings.gameSpeedMultiplier) {
simulationMult = state.settings.gameSpeedMultiplier;
}

const dt = DT_SPEED * simulationMult;

// Step simulation precisely with calculated dt
const nextState = gameLoopStep(state, dt);
games.set(lobbyId, nextState);
}

// Broadcast updated state delta to all clients in the lobby
const clients = lobbyClients.get(lobbyId);
if (clients && clients.size > 0) {
const nextState = games.get(lobbyId)!;
const deltaPacket = buildDeltaPacket(lobbyId, nextState);
try {
const binaryData = encode(deltaPacket);
clients.forEach(client => {
if (client.ws.readyState === WebSocket.OPEN) {
client.ws.send(binaryData);
}
});
} catch (encodeErr) {
console.error(`Failed to binary serialize delta update for ${lobbyId}:`, encodeErr);
}
}
}, TICK_INTERVAL_MS);

lobbyLoops.set(lobbyId, loop);
}

// Handle Upgrade manually to coordinate Express & WebSockets cleanly
server.on('upgrade', (request, socket, head) => {
wss.handleUpgrade(request, socket, head, (ws) => {
wss.emit('connection', ws, request);
});
});

// Client connection handler
wss.on('connection', (ws: WebSocket) => {
let currentLobbyId = 'sandbox';
let playerTeam: 1 | 2 | 3 | 4 | 'spectator' = 'spectator';
let pName = 'Spectator';

ws.on('message', (messageStr: string) => {
try {
const msg: ClientMessage = JSON.parse(messageStr);

if (msg.type === 'join') {
const lobbyId = msg.lobbyId || 'sandbox';
currentLobbyId = lobbyId;

let defaultName = 'Spectator';
if (msg.team) {
defaultName = `Player ${msg.team} (${FACTION_INFO[msg.team].name})`;
}
pName = msg.playerName || defaultName;

// Initialize game if not exists
if (!games.has(lobbyId)) {
const isAi = true; // AI is enabled by default to fill the remaining 3 FFA vacant slots
games.set(lobbyId, createInitialState(lobbyId, isAi));
}
startLobbyGameLoop(lobbyId); // Ensure loop is initialized for this lobby

const currentGameState = games.get(lobbyId)!;

// Register clients
if (!lobbyClients.has(lobbyId)) {
lobbyClients.set(lobbyId, new Set());
}

const clients = lobbyClients.get(lobbyId)!;

// Determine or assign 4-player Team FFA slots
if (msg.team && msg.team >= 1 && msg.team <= 4) {
// Check if team is already taken by an active connection in this lobby
const teamTaken = Array.from(clients).some(c => c.team === msg.team);
if (!teamTaken) {
playerTeam = msg.team;
// Update state player to reflect human
const playerObj = currentGameState.players[playerTeam];
if (playerObj) {
playerObj.name = pName;
}
} else {
playerTeam = 'spectator';
}
} else {
// Spectator requested
playerTeam = 'spectator';
}

// Register client details
const clientData: SourcedClient = { ws, team: playerTeam, playerName: pName };
clients.add(clientData);

// Update human player metadata if joining slot
if (playerTeam !== 'spectator') {
const playerState = currentGameState.players[playerTeam];
if (playerState) {
playerState.name = pName;
}
}

// Send welcome packet with dynamic assigned team
ws.send(JSON.stringify({
type: 'init',
team: playerTeam,
gameState: currentGameState
}));

console.log(`User ${pName} joined lobby "${lobbyId}" as team ${playerTeam}`);
}

else if (msg.type === 'action') {
const gameState = games.get(currentLobbyId);
if (gameState && playerTeam !== 'spectator' && msg.action) {
applyAction(gameState, playerTeam, msg.action);
}
}

else if (msg.type === 'toggle_ai') {
const gameState = games.get(currentLobbyId);
if (gameState) {
gameState.isAiEnabled = !gameState.isAiEnabled;
// Update CPU name to show status for vacant slots
const clients = lobbyClients.get(currentLobbyId) || new Set<SourcedClient>();
const humanTeams = new Set(Array.from(clients).map(c => c.team).filter(t => t !== 'spectator'));

const teamsList: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
teamsList.forEach(t => {
if (!humanTeams.has(t)) {
const playerState = gameState.players[t];
if (playerState) {
playerState.name = gameState.isAiEnabled ? `CPU Bot (${FACTION_INFO[t].name})` : `Vacant Slot (${FACTION_INFO[t].name})`;
}
}
});
}
}

else if (msg.type === 'update_settings') {
const gameState = games.get(currentLobbyId);
if (gameState && msg.settings) {
gameState.settings = { ...gameState.settings, ...msg.settings };

// Sync with wave intervals immediately if modified
if (msg.settings.waveInterval !== undefined) {
gameState.maxWaveTimer = msg.settings.waveInterval;
gameState.waveTimer = Math.min(gameState.waveTimer, msg.settings.waveInterval);
}
}
}

else if (msg.type === 'restart') {
const gameState = games.get(currentLobbyId);
if (gameState) {
const nextIdx = createInitialState(currentLobbyId, gameState.isAiEnabled, gameState.settings);

// Retain joined human player configurations
const clients = lobbyClients.get(currentLobbyId);
if (clients) {
clients.forEach(c => {
if (c.team !== 'spectator') {
const p = nextIdx.players[c.team];
if (p) p.name = c.playerName;
}
});
}

// RESET known unit IDs for this lobby so they re-transmit on next tick!
lobbyKnownUnitIds.set(currentLobbyId, new Set());

games.set(currentLobbyId, nextIdx);
startLobbyGameLoop(currentLobbyId);
}
}

} catch (err) {
console.error('Error handling websocket message:', err);
}
});

ws.on('close', () => {
const clients = lobbyClients.get(currentLobbyId);
if (clients) {
let disconnectedClient: SourcedClient | undefined;
clients.forEach(c => {
if (c.ws === ws) {
disconnectedClient = c;
}
});

if (disconnectedClient) {
clients.delete(disconnectedClient);
console.log(`User ${disconnectedClient.playerName} left lobby "${currentLobbyId}"`);

// Restore slot to CPU bot if human leaves so the FFA continues beautifully
const gameState = games.get(currentLobbyId);
if (gameState) {
const team = disconnectedClient.team;
if (team !== 'spectator') {
const pState = gameState.players[team];
if (pState) {
pState.name = `CPU Bot (${FACTION_INFO[team].name})`;
}
}
}
}

// Clean up empty lobbies to save memory
if (clients.size === 0) {
lobbyClients.delete(currentLobbyId);
games.delete(currentLobbyId);

const loop = lobbyLoops.get(currentLobbyId);
if (loop) {
clearInterval(loop);
lobbyLoops.delete(currentLobbyId);
}
lobbyKnownUnitIds.delete(currentLobbyId);
}
}
});
});

// Serve static UI or bind Vite Dev Server in dev mode
if (process.env.NODE_ENV !== 'production') {
const vite = await createViteServer({
server: { middlewareMode: true },
appType: 'spa',
optimizeDeps: {
force: true
}
});
app.use(vite.middlewares);
} else {
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
res.sendFile(path.join(distPath, 'index.html'));
});
}

// Set standard router diagnostic APIs
app.get('/api/health', (req, res) => {
res.json({
status: 'health-ok',
lobbiesCount: games.size,
time: new Date().toISOString()
});
});

server.listen(PORT, '0.0.0.0', () => {
console.log(`[Server] Survival Chaos system running on http://localhost:${PORT}`);
});
}

startServer().catch(err => {
console.error('Critical Server Boot Failure', err);
});
