import React, { useEffect, useRef, useState } from 'react';
import { GameState, PlayerAction, ClientMessage, ServerMessage, LaneType, RaceType, GameModeType } from './types';
import { GameCanvas } from './components/GameCanvas';
import { decode } from '@msgpack/msgpack';
import { GameDashboard } from './components/GameDashboard';
import { soundManager } from './audio';
import { 
Swords, Users, Bot, RefreshCw, Trophy, HelpCircle, 
Wifi, WifiOff, Globe, Play, UserCheck, ShieldAlert, Sparkles, Map as MapIcon 
} from 'lucide-react';
import { FACTION_INFO, RACE_INFO } from './engine';
import { PATCH_NOTES } from './patchNotes';

export default function App() {
const [socket, setSocket] = useState<WebSocket | null>(null);
const [isConnected, setIsConnected] = useState(false);
const [volume, setVolume] = useState(0.25);

// Sync initial volume with the sound manager
useEffect(() => {
soundManager.setVolume(volume);
}, []);

// Game session states
const [lobbyId, setLobbyId] = useState('lobby-1');
const [playerName, setPlayerName] = useState('Marshal Soren');
const [teamSelection, setTeamSelection] = useState<1 | 2 | 3 | 4>(1);
const [activeTeam, setActiveTeam] = useState<1 | 2 | 3 | 4 | 'spectator'>('spectator');
const [gameState, setGameState] = useState<GameState | null>(null);
const gameStateRef = useRef<GameState | null>(null);

// Race Selector States
const [selectedRace, setSelectedRace] = useState<RaceType>('human');
const [hoveredRace, setHoveredRace] = useState<RaceType | null>(null);

// Selection HUD
const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
const [selectedLane, setSelectedLane] = useState<LaneType>('middle');

// Tabs & Instruction details
const [isJoined, setIsJoined] = useState(false);
const [isJoining, setIsJoining] = useState(false);
const [lobbyError, setLobbyError] = useState<string | null>(null);
const [showInstructions, setShowInstructions] = useState(true);

// Pre-join Lobby settings configs
const [lobbySpeed, setLobbySpeed] = useState<number>(1.0);
const [lobbyDifficulty, setLobbyDifficulty] = useState<'easy' | 'moderate' | 'brutal'>('moderate');
const [lobbyMapStyle, setLobbyMapStyle] = useState<'cosmic' | 'woods' | 'desert'>('cosmic');

// Auto reconnect ref
const reconnectTimeoutRef = useRef<any>(null);

// Initialize and connect WebSockets
const connectToSocket = (proposedLobby: string, selectedSlot: 1 | 2 | 3 | 4, uName: string) => {
if (socket) {
socket.close();
}

setIsConnected(false);
setIsJoining(true);
setLobbyError(null);

// Dynamic protocol and host deduction based on window location
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const socketUrl = `${protocol}//${window.location.host}`;

console.log(`[Client] Connecting to WebSocket: ${socketUrl}`);
const ws = new WebSocket(socketUrl);

ws.onopen = () => {
console.log('[Client] Connected to WebSocket game server');
setIsConnected(true);
setIsJoining(false);

// Join lobby welcome packet
const joinPacket: ClientMessage = {
type: 'join',
lobbyId: proposedLobby,
playerName: uName,
team: selectedSlot
};
ws.send(JSON.stringify(joinPacket));

// Instantly dispatch initial lobby preferences
ws.send(JSON.stringify({
type: 'update_settings',
settings: {
gameSpeedMultiplier: lobbySpeed,
aiDifficulty: lobbyDifficulty,
mapStyle: lobbyMapStyle
}
}));
};

ws.binaryType = 'arraybuffer';

ws.onmessage = async (event) => {
try {
let msg: any;
if (event.data instanceof ArrayBuffer) {
const rawData = new Uint8Array(event.data);
msg = decode(rawData);
} else {
msg = JSON.parse(event.data);
}

if (msg.type === 'init') {
if (msg.team) {
setActiveTeam(msg.team);
}
if (msg.gameState) {
setGameState(msg.gameState);
gameStateRef.current = msg.gameState;
soundManager.processStateUpdates(msg.gameState);
setIsJoined(true);
}
} 

else if (msg.type === 'state_update') {
if (msg.gameState) {
setGameState(msg.gameState);
gameStateRef.current = msg.gameState;
soundManager.processStateUpdates(msg.gameState);
}
}

else if (msg.type === 'delta_update') {
const current = gameStateRef.current;
if (current) {
const nextUnits = [...current.units];

// 1. Process deletes
const deletes: string[] = msg.deletes || [];
const activeUnits = nextUnits.filter(u => !deletes.includes(u.id));

// 2. Process updates
const updates: any[] = msg.updates || [];
const updateMap = new globalThis.Map<string, any>();
updates.forEach(u => updateMap.set(u[0], u));

const updatedUnits = activeUnits.map(u => {
const upd = updateMap.get(u.id);
if (upd) {
return {
...u,
x: upd[1],
y: upd[2],
hp: upd[3],
state: upd[4],
targetId: upd[5]
};
}
return u;
});

// 3. Process spawns (new units)
const spawns: any[] = msg.spawns || [];
const finalUnits = [...updatedUnits, ...spawns];

// 4. Update player states map
const updatedPlayers = { ...current.players };
const pData = msg.players;
if (pData) {
const keys: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
keys.forEach(k => {
if (pData[k]) {
updatedPlayers[k] = {
...current.players[k],
...pData[k]
};
} else {
updatedPlayers[k] = null;
}
});
}

// 5. Update towers
const towersList = current.towers.map(t => {
const updT = msg.towers.find((ut: any) => ut.id === t.id);
if (updT) {
return {
...t,
hp: updT.hp,
maxHp: updT.maxHp,
level: updT.level,
atk: updT.atk,
range: updT.range,
targetId: updT.targetId
};
}
return t;
});

const nextState: GameState = {
...current,
gameTime: msg.gameTime,
waveTimer: msg.waveTimer,
maxWaveTimer: msg.maxWaveTimer,
status: msg.status,
winnerTeam: msg.winnerTeam,
isAiEnabled: msg.isAiEnabled,
units: finalUnits,
players: updatedPlayers,
towers: towersList,
projectiles: msg.projectiles,
effects: msg.effects || [],
floatingTexts: msg.floatingTexts || [],
settings: msg.settings || current.settings,
neutralBuildings: msg.neutralBuildings || current.neutralBuildings
};

setGameState(nextState);
gameStateRef.current = nextState;
soundManager.processStateUpdates(nextState);
}
}
} catch (err) {
console.error('Error parsing server messaging packet', err);
}
};

ws.onclose = () => {
console.log('[Client] Socket connection dropped.');
setIsConnected(false);
setIsJoining(false);
if (!isJoined) {
setLobbyError('Failed to establish link with command portal. Make sure local backend server is operational.');
}

// Schedule auto-reconnect only if already inside a match session
if (isJoined) {
if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
reconnectTimeoutRef.current = setTimeout(() => {
connectToSocket(proposedLobby, selectedSlot, uName);
}, 3000);
}
};

ws.onerror = (err) => {
console.error('[Client] Socket error:', err);
setIsJoining(false);
};

setSocket(ws);
};

// Safe timer cleanup on component unmount (no auto-lobby connect on start)
useEffect(() => {
return () => {
if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
};
}, []);

// Global Keyboard hotkeys for classic WC3 play
useEffect(() => {
const handleKeyDown = (e: KeyboardEvent) => {
// Disable hotkeys if user is focusing an input field
if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
return;
}

if (!gameState || activeTeam === 'spectator') return;

const key = e.key.toLowerCase();
const p = gameState.players[activeTeam];
if (!p) return;

// Handle race selection hotkeys in race selection phase
if (gameState.status === 'race_selection') {
const hotkeysMap: Record<string, RaceType> = {
q: 'human', w: 'orc', e: 'demon', r: 'night_elf',
a: 'dwarf', s: 'troll', d: 'undead', f: 'naga',
z: 'mercenary', x: 'tauren', c: 'fel_orc', v: 'blood_elf'
};
const race = hotkeysMap[key];
if (race && !p.raceLocked) {
e.preventDefault();
setSelectedRace(race);
handleSendAction({ type: 'select_race', race });
}
return;
}

switch (key) {
// Row 1: Barracks upgrades (Q, W, E) & Hero (R)
case 'q':
e.preventDefault();
if (p.barracksLevel.top === 0) break;
handleSendAction({ type: 'upgrade_barracks', lane: 'top' });
break;
case 'w':
e.preventDefault();
if (p.barracksLevel.middle === 0) break;
handleSendAction({ type: 'upgrade_barracks', lane: 'middle' });
break;
case 'e':
e.preventDefault();
if (p.barracksLevel.bottom === 0) break;
handleSendAction({ type: 'upgrade_barracks', lane: 'bottom' });
break;
case 'r':
e.preventDefault();
handleSendAction({ type: 'summon_hero' });
break;

// Row 2: Mercenaries (A, S, D, F) relative to currently selectedLane
case 'a':
e.preventDefault();
if (p.barracksLevel[selectedLane] === 0) break;
handleSendAction({ type: 'hire_mercenary', lane: selectedLane, unitType: 'melee' });
break;
case 's':
e.preventDefault();
if (p.barracksLevel[selectedLane] === 0) break;
handleSendAction({ type: 'hire_mercenary', lane: selectedLane, unitType: 'ranged' });
break;
case 'd':
e.preventDefault();
if (p.barracksLevel[selectedLane] === 0) break;
handleSendAction({ type: 'hire_mercenary', lane: selectedLane, unitType: 'mage' });
break;
case 'f':
e.preventDefault();
if (p.barracksLevel[selectedLane] === 0) break;
handleSendAction({ type: 'hire_mercenary', lane: selectedLane, unitType: 'siege' });
break;

// Row 3: Spells (Z, X, C, V) relative to currently selectedLane
case 'z':
e.preventDefault();
handleSendAction({ type: 'cast_spell', lane: selectedLane, spellType: 'meteor' });
break;
case 'x':
e.preventDefault();
handleSendAction({ type: 'cast_spell', lane: selectedLane, spellType: 'storm' });
break;
case 'c':
e.preventDefault();
handleSendAction({ type: 'cast_spell', lane: selectedLane, spellType: 'bloodlust' });
break;
case 'v':
e.preventDefault();
if (p.ultimateResearched) {
handleSendAction({ type: 'cast_spell', lane: selectedLane, spellType: 'ultimate' });
} else {
handleSendAction({ type: 'cast_spell', lane: selectedLane, spellType: 'scourge_raise' });
}
break;
case 'g':
e.preventDefault();
if (p.ultimateResearched) {
handleSendAction({ type: 'cast_spell', lane: selectedLane, spellType: 'ultimate' });
}
break;

// Direct upgrades: Income (I) & Selected Tower (U)
case 'i':
e.preventDefault();
handleSendAction({ type: 'upgrade_income' });
break;
case 'u':
if (selectedTowerId) {
e.preventDefault();
handleSendAction({ type: 'upgrade_tower', towerId: selectedTowerId });
}
break;
case '1':
case '2':
case '3':
case '4':
case '5':
if (selectedTowerId && selectedTowerId.startsWith('castle-')) {
e.preventDefault();
const upgradeTypes: ('meleeAtk' | 'rangedAtk' | 'magicAtk' | 'defense' | 'masonry')[] = [
'meleeAtk', 'rangedAtk', 'magicAtk', 'defense', 'masonry'
];
const idx = parseInt(key, 10) - 1;
const upgradeType = upgradeTypes[idx];
if (upgradeType) {
handleSendAction({ type: 'research_upgrade', upgradeType });
}
}
break;
default:
break;
}
};

window.addEventListener('keydown', handleKeyDown);
return () => {
window.removeEventListener('keydown', handleKeyDown);
};
}, [gameState, activeTeam, selectedLane, selectedTowerId]);

// Action dispatcher
const handleSendAction = (action: PlayerAction) => {
soundManager.playUiClick();
if (socket && socket.readyState === WebSocket.OPEN) {
const payload: ClientMessage = {
type: 'action',
action
};
socket.send(JSON.stringify(payload));
}
};

const handleUpdateSettings = (settings: any) => {
soundManager.playUiClick();
if (socket && socket.readyState === WebSocket.OPEN) {
socket.send(JSON.stringify({
type: 'update_settings',
settings
}));
}
};

// Bot control toggler
const handleToggleAi = () => {
soundManager.playUiClick();
if (socket && socket.readyState === WebSocket.OPEN) {
socket.send(JSON.stringify({ type: 'toggle_ai' }));
}
};

// Lobby rejoin handler
const handleJoinLobby = (e: React.FormEvent) => {
soundManager.playUiClick();
e.preventDefault();
connectToSocket(lobbyId.trim().toLowerCase(), teamSelection, playerName.trim() || 'Commander');
};

const handleRestartMatch = () => {
soundManager.playUiClick();
if (socket && socket.readyState === WebSocket.OPEN) {
socket.send(JSON.stringify({ type: 'restart' }));
setSelectedTowerId(null);
}
};

// Formatter for game metrics elapsed timer
const formatTimer = (seconds: number) => {
const min = Math.floor(seconds / 60);
const sec = Math.floor(seconds % 60);
return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

// Formatter for Wave Progress seconds duration
const getSecondsToWave = () => {
if (!gameState) return 0;
return (gameState.waveTimer / 60).toFixed(1);
};

// Setup gorgeous status list
const teamArray: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

const handleRandomizeName = () => {
soundManager.playUiClick();
const WARCRAFT_NAMES = [
"Marshal Othmar", "Kel'Thuzad", "Warlord Grommash", "Pit Lord Azgalor", "Prince Kael'thas",
"Sylvanas Windrunner", "Arthas Menethil", "Uther Lightbringer", "Rexxar Champion",
"Illidan Stormrage", "Jaina Proudmoore", "Muradin Bronzebeard", "Anub'arak", 
"Thrall Durotan", "Mal'Ganis", "Lady Vashj", "Tyrande Whisperwind", "Vol'jin Shadow",
"Garrosh Hellscream", "High Tinker Mekkatorque", "Archmage Antonidas"
];
const randomIndex = Math.floor(Math.random() * WARCRAFT_NAMES.length);
setPlayerName(WARCRAFT_NAMES[randomIndex]);
};

const handleGenerateLobbyKey = () => {
const keys = ["LOBBY", "ARENA", "CHAOS", "SURVIVAL", "WC3", "FORTRESS"];
const randomPrefix = keys[Math.floor(Math.random() * keys.length)];
const randomNumber = Math.floor(100 + Math.random() * 900);
setLobbyId(`${randomPrefix}-${randomNumber}`);
};

const [chatMessages, setChatMessages] = useState<{name: string; msg: string; color: string}[]>([]);
const [chatInput, setChatInput] = useState('');

const handleSendChat = (e: React.FormEvent) => {
e.preventDefault();
if (!chatInput.trim()) return;
setChatMessages(prev => [...prev, { name: playerName || 'You', msg: chatInput.trim(), color: '#3b82f6' }]);
setChatInput('');
};

if (!isJoined) {
return (
<div
className="app-shell bg-[#05080f] text-slate-100 overflow-y-auto font-sans select-none"
style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(30,27,75,0.35) 0%, rgba(5,8,15,1) 60%)' }}
>
{/* Ambient background glows */}
<div className="fixed inset-0 pointer-events-none z-0">
<div className="absolute top-0 left-1/4 w-[600px] h-[400px] rounded-full bg-indigo-900/15 blur-[120px]" />
<div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] rounded-full bg-amber-900/10 blur-[120px]" />
</div>

<div className="relative z-10 max-w-[1600px] mx-auto px-4 py-4 space-y-4">

{/* ══ TITLE BAR ══ */}
<div className="flex items-center justify-between py-3 border-b border-slate-800/80">
<div className="flex items-center gap-4">
<div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl">
<Swords className="w-6 h-6 text-amber-400" />
</div>
<div>
<h1 className="font-w3-title text-xl font-black text-amber-400 uppercase tracking-widest leading-none">
Survival Chaos
</h1>
<p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">Custom Game Browser — 4 Player FFA</p>
</div>
</div>
<div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
<span className="flex items-center gap-1.5 text-emerald-400">
<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
ONLINE
</span>
</div>
</div>

{/* ══ MAIN 3-COLUMN LAYOUT ══ */}
<div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

{/* ── LEFT SIDEBAR: Player Info & Settings ── */}
<div className="xl:col-span-3 space-y-3">

{/* Player Card */}
<div className="w3-leaves-frame rounded-xl overflow-hidden">
<div className="w3-modal-stone p-4 space-y-4">
<div className="border-b border-amber-800/30 pb-2">
<p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Your Profile</p>
</div>

{/* Avatar + Name */}
<div className="flex items-center gap-3">
<div className="w3-portrait-frame w-12 h-12 shrink-0 flex items-center justify-center text-2xl">
⚔️
</div>
<div className="flex-1 min-w-0">
<p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Commander</p>
<p className="text-sm font-black text-amber-300 truncate font-w3-title">{playerName || 'Anonymous'}</p>
</div>
</div>

<div className="space-y-2">
<label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Battle Tag</label>
<div className="flex gap-1.5">
<input
type="text"
value={playerName}
onChange={(e) => setPlayerName(e.target.value)}
placeholder="Enter warlord name..."
className="flex-1 bg-slate-950/70 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-600/50 font-mono min-w-0"
/>
<button
type="button"
onClick={handleRandomizeName}
className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-amber-400 text-xs transition-colors cursor-pointer shrink-0"
title="Random Name"
>🎲</button>
</div>
</div>
</div>
</div>

{/* Faction Slot Selection */}
<div className="w3-leaves-frame rounded-xl overflow-hidden">
<div className="w3-modal-stone p-4 space-y-3">
<p className="text-[9px] font-black text-amber-600 uppercase tracking-widest border-b border-amber-800/30 pb-2">Select Faction Gate</p>
<div className="space-y-1.5">
{[
{ slot: 1, label: 'Slot 1', color: '#3b82f6', loc: 'SW Corner' },
{ slot: 2, label: 'Slot 2', color: '#ef4444', loc: 'NW Corner' },
{ slot: 3, label: 'Slot 3', color: '#a855f7', loc: 'NE Corner' },
{ slot: 4, label: 'Slot 4', color: '#10b981', loc: 'SE Corner' },
].map(f => {
const isSelected = teamSelection === f.slot;
return (
<button
key={f.slot}
type="button"
onClick={() => { soundManager.playUiClick(); setTeamSelection(f.slot as any); }}
className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
isSelected
? 'border-amber-500/70 bg-slate-950/80'
: 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
}`}
style={isSelected ? { boxShadow: `inset 0 0 16px ${f.color}18` } : {}}
>
<div
className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-black shrink-0 border"
style={{ borderColor: `${f.color}50`, backgroundColor: `${f.color}15`, color: f.color }}
>
{f.slot}
</div>
<div className="flex-1 min-w-0">
<p className="text-[10px] font-black truncate" style={{ color: isSelected ? f.color : '#cbd5e1' }}>{f.label}</p>
<p className="text-[8px] text-slate-600 font-mono">{f.loc}</p>
</div>
{isSelected && (
<span className="text-[8px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">YOU</span>
)}
</button>
);
})}
</div>
</div>
</div>

{/* Match Config */}
<div className="w3-leaves-frame rounded-xl overflow-hidden">
<div className="w3-modal-stone p-4 space-y-3">
<p className="text-[9px] font-black text-amber-600 uppercase tracking-widest border-b border-amber-800/30 pb-2">Match Configuration</p>

<div className="space-y-2.5">
<div>
<label className="text-[8px] font-bold text-slate-600 uppercase tracking-wider block mb-1">AI Difficulty</label>
<div className="grid grid-cols-3 gap-1">
{[
{ v: 'easy', label: 'Easy', color: 'text-emerald-400' },
{ v: 'moderate', label: 'Normal', color: 'text-amber-400' },
{ v: 'brutal', label: 'Brutal', color: 'text-rose-400' },
].map(d => (
<button key={d.v} type="button" onClick={() => setLobbyDifficulty(d.v as any)}
className={`py-1 text-[8px] font-black uppercase rounded border transition-all cursor-pointer ${lobbyDifficulty === d.v ? `border-current ${d.color} bg-slate-950/80` : 'border-slate-800 text-slate-600 hover:text-slate-400'}`}>
{d.label}
</button>
))}
</div>
</div>

<div>
<label className="text-[8px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Game Speed</label>
<div className="grid grid-cols-3 gap-1">
{[{ label: '1×', val: 1.0 }, { label: '1.5×', val: 1.5 }, { label: '2×', val: 2.0 }].map(s => (
<button key={s.val} type="button" onClick={() => setLobbySpeed(s.val)}
className={`py-1 text-[8px] font-black uppercase rounded border transition-all cursor-pointer ${lobbySpeed === s.val ? 'border-amber-500/70 text-amber-400 bg-slate-950/80' : 'border-slate-800 text-slate-600 hover:text-slate-400'}`}>
{s.label}
</button>
))}
</div>
</div>

<div>
<label className="text-[8px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Terrain</label>
<div className="grid grid-cols-3 gap-1">
{[
{ v: 'cosmic', label: 'Cosmic', emoji: '🌌' },
{ v: 'woods', label: 'Forest', emoji: '🌲' },
{ v: 'desert', label: 'Desert', emoji: '🏜️' },
].map(t => (
<button key={t.v} type="button" onClick={() => setLobbyMapStyle(t.v as any)}
className={`py-1 text-[8px] font-black uppercase rounded border transition-all cursor-pointer flex flex-col items-center gap-0.5 ${lobbyMapStyle === t.v ? 'border-indigo-500/70 text-indigo-300 bg-slate-950/80' : 'border-slate-800 text-slate-600 hover:text-slate-400'}`}>
<span>{t.emoji}</span>
<span>{t.label}</span>
</button>
))}
</div>
</div>
</div>
</div>
</div>
</div>

{/* ── CENTER: Game List + Player Slots ── */}
<div className="xl:col-span-6 space-y-3">

{/* Game List Table */}
<div className="w3-leaves-frame rounded-xl overflow-hidden">
<div className="w3-modal-stone p-0 overflow-hidden">
{/* Table Header */}
<div className="px-4 py-2.5 border-b border-amber-900/30 flex items-center justify-between">
<p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Custom Game List</p>
<button
type="button"
className="flex items-center gap-1 text-[9px] text-amber-500/70 hover:text-amber-400 transition-colors cursor-pointer font-bold uppercase tracking-wider"
onClick={() => soundManager.playUiClick()}
>
<RefreshCw className="w-3 h-3" />
Refresh
</button>
</div>

{/* Column Headers */}
<div className="grid bg-slate-950/60 px-3 py-1.5 text-[8px] font-black text-slate-600 uppercase tracking-wider border-b border-slate-800/50"
style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
<span>Game Name</span>
<span>Host</span>
<span className="text-center">Players</span>
<span className="text-center">Ping</span>
<span className="text-center">Status</span>
</div>

{/* Empty State */}
<div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
<div className="text-4xl opacity-20">🏰</div>
<p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No games found</p>
<p className="text-[9px] text-slate-700 font-mono">Create a room below or enter a Room ID to join a friend.</p>
</div>
</div>
</div>

{/* Selected Lobby Detail / Player Slots */}
<div className="w3-leaves-frame rounded-xl overflow-hidden">
<div className="w3-modal-stone p-4 space-y-3">
<div className="border-b border-amber-800/30 pb-2">
<p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Player Slots</p>
</div>

{/* 4 Player Slot Cards */}
<div className="grid grid-cols-2 gap-2">
{[
{ slot: 1, label: 'Slot 1', color: '#3b82f6', loc: 'SW Gate' },
{ slot: 2, label: 'Slot 2', color: '#ef4444', loc: 'NW Gate' },
{ slot: 3, label: 'Slot 3', color: '#a855f7', loc: 'NE Gate' },
{ slot: 4, label: 'Slot 4', color: '#10b981', loc: 'SE Gate' },
].map(slot => {
const isMe = teamSelection === slot.slot;

return (
<div
key={slot.slot}
className="p-3 rounded-xl border flex items-center gap-3"
style={{
borderColor: isMe ? '#f59e0b' : '#1e293b',
background: isMe ? 'rgba(245,158,11,0.05)' : 'rgba(2,6,23,0.5)',
boxShadow: isMe ? '0 0 12px rgba(245,158,11,0.1)' : 'none'
}}
>
<div
className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black shrink-0 border"
style={{ borderColor: isMe ? '#f59e0b' : `${slot.color}35`, backgroundColor: `${slot.color}10`, color: isMe ? '#f59e0b' : slot.color }}
>
{slot.slot}
</div>
<div className="flex-1 min-w-0">
<p className="text-[9px] font-black uppercase tracking-wider" style={{ color: slot.color }}>{slot.label}</p>
<p className="text-[8px] text-slate-600 font-mono">{slot.loc}</p>
<p className="text-[10px] font-bold mt-0.5 truncate" style={{ color: isMe ? '#fbbf24' : '#94a3b8' }}>
{isMe ? `▶ ${playerName || 'You'}` : '○ Open Slot'}
</p>
</div>
{isMe && <span className="text-[7px] font-black text-amber-400 bg-amber-500/15 px-1 py-0.5 rounded border border-amber-500/30 shrink-0">YOU</span>}
</div>
);
})}
</div>

{/* Map preview snippet */}
<div className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
<div className="w-16 h-16 rounded-lg shrink-0 flex items-center justify-center text-3xl bg-slate-900/80 border border-slate-800">
{lobbyMapStyle === 'cosmic' ? '🌌' : lobbyMapStyle === 'woods' ? '🌲' : '🏜️'}
</div>
<div className="space-y-1 flex-1">
<p className="text-[9px] font-black text-slate-200 uppercase tracking-wider">
Survival Chaos Arena — {lobbyMapStyle === 'cosmic' ? 'Cosmic Void' : lobbyMapStyle === 'woods' ? 'Elwynn Forest' : 'Sandy Dunes'}
</p>
<p className="text-[8px] text-slate-500 leading-relaxed">
1800×1800 symmetric 4-quadrant auto-battle map. All 4 factions begin at corner fortresses and send waves across 6 lane pathways to destroy enemy castles.
</p>
<div className="flex items-center gap-2 mt-1">
<span className="text-[8px] font-bold text-amber-500/70 uppercase">4 Players</span>
<span className="text-slate-700">·</span>
<span className="text-[8px] font-bold text-indigo-400/70 uppercase">FFA</span>
<span className="text-slate-700">·</span>
<span className="text-[8px] font-bold text-emerald-400/70 uppercase">{lobbyDifficulty} Bots</span>
</div>
</div>
</div>
</div>
</div>

{/* Lobby Key Row */}
<div className="flex gap-2">
<div className="flex-1 flex gap-2">
<div className="flex-1 relative">
<input
type="text"
value={lobbyId}
onChange={(e) => setLobbyId(e.target.value)}
placeholder="Lobby Room ID..."
className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-amber-600/50 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none font-mono transition-all"
/>
</div>
<button
type="button"
onClick={() => { soundManager.playUiClick(); handleGenerateLobbyKey(); }}
className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-amber-400 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
>
🔑 New Key
</button>
</div>

{/* JOIN BUTTON */}
<button
type="button"
onClick={() => connectToSocket(lobbyId.trim().toLowerCase(), teamSelection, playerName.trim() || 'Commander')}
className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-amber-600/20 cursor-pointer whitespace-nowrap"
>
<Play className="w-4 h-4 fill-slate-950" />
Join Game
</button>
</div>
</div>

{/* ── RIGHT SIDEBAR: Chat & News ── */}
<div className="xl:col-span-3 space-y-3">

{/* Lobby Chat */}
<div className="w3-leaves-frame rounded-xl overflow-hidden flex flex-col" style={{ height: '440px' }}>
<div className="w3-modal-stone flex flex-col h-full p-0 overflow-hidden">
<div className="px-4 py-2.5 border-b border-amber-800/30 shrink-0">
<p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">🗨 Global Lobby Chat</p>
</div>

{/* Messages */}
<div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
{chatMessages.map((m, i) => (
<div key={i} className="text-[10px] leading-snug">
<span className="font-black" style={{ color: m.color }}>{m.name}: </span>
<span className="text-slate-300">{m.msg}</span>
</div>
))}
</div>

{/* Chat Input */}
<form onSubmit={handleSendChat} className="border-t border-slate-800/60 p-2 shrink-0 flex gap-1.5">
<input
type="text"
value={chatInput}
onChange={(e) => setChatInput(e.target.value)}
placeholder="Say something..."
className="flex-1 bg-slate-950/70 border border-slate-800 rounded px-2 py-1.5 text-[10px] text-slate-200 focus:outline-none focus:border-amber-600/40 font-mono min-w-0"
/>
<button
type="submit"
className="px-2.5 py-1.5 bg-amber-600/80 hover:bg-amber-500 text-slate-950 text-[9px] font-black rounded transition-colors cursor-pointer shrink-0"
>Send</button>
</form>
</div>
</div>

{/* News / Patch Notes Panel */}
<div className="w3-leaves-frame rounded-xl overflow-hidden">
<div className="w3-modal-stone p-4 space-y-2.5">
<p className="text-[9px] font-black text-amber-600 uppercase tracking-widest border-b border-amber-800/30 pb-2">📜 Patch Notes</p>
<div className="space-y-2 text-[9px]">
{PATCH_NOTES.map(p => (
<div key={p.v} className="flex gap-2 items-start">
<span className="text-amber-500/60 font-mono shrink-0 font-black mt-0.5">{p.v}</span>
<div>
<span className="text-slate-600 font-mono">{p.date} — </span>
<span className="text-slate-400">{p.note}</span>
</div>
</div>
))}
</div>
</div>
</div>

{/* Quick Create */}
<div className="w3-leaves-frame rounded-xl overflow-hidden">
<div className="w3-modal-stone p-4 space-y-3">
<p className="text-[9px] font-black text-amber-600 uppercase tracking-widest border-b border-amber-800/30 pb-2">⚡ Quick Create</p>
<p className="text-[9px] text-slate-500">Create your own private room and wait for opponents, or play against AI bots.</p>
<button
type="button"
onClick={() => {
soundManager.playUiClick();
handleGenerateLobbyKey();
setTimeout(() => connectToSocket(lobbyId.trim().toLowerCase(), teamSelection, playerName.trim() || 'Commander'), 50);
}}
className="w3-button-stone w-full text-amber-400 hover:text-amber-300 py-2 text-[10px]"
>
🏰 Create New Game Room
</button>
</div>
</div>
</div>

</div>

{/* Lobby Error Warning */}
{lobbyError && (
<div className="bg-rose-950/20 border border-rose-900/60 p-3 rounded-xl flex items-start gap-2 animate-bounce">
<ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
<p className="text-[10px] text-rose-300 leading-relaxed font-bold">{lobbyError}</p>
</div>
)}

</div>

{/* Connecting Overlay */}
{isJoining && (
<div className="fixed inset-0 bg-slate-950/92 z-50 flex flex-col items-center justify-center space-y-5 backdrop-blur-sm">
<div className="relative">
<div className="w-20 h-20 border-4 border-amber-500/25 border-t-amber-500 rounded-full animate-spin" />
<Swords className="w-8 h-8 text-amber-400 absolute inset-0 m-auto animate-pulse" />
</div>
<div className="text-center space-y-1.5">
<p className="text-sm font-black uppercase tracking-widest text-amber-400 font-w3-title animate-pulse">Entering the Arena...</p>
<p className="text-[10px] text-slate-400">Verifying warlord credentials and deploying faction towers...</p>
<p className="text-[9px] text-slate-600 font-mono">{lobbyId.toUpperCase()}</p>
</div>
</div>
)}
</div>
);
}

return (
<div className="app-shell bg-slate-950 text-slate-100 font-sans">

{/* 1. Header Navigation */}
<header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-850 backdrop-blur-md">
<div className="max-w-[1920px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
<div className="flex items-center gap-3">
<div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl shadow-inner">
<Swords className="w-5 h-5 text-indigo-400 animate-pulse" />
</div>
<div>
<h1 className="font-extrabold text-sm tracking-tight text-white uppercase flex items-center gap-2">
Survival Chaos <span className="text-indigo-400 font-mono text-[9px] bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">4P FFA MULTIPLAYER</span>
</h1>
<p className="text-[10px] text-slate-400 font-medium">Server-Authoritative Real-Time Auto-Battler Strategy Arena</p>
</div>
</div>

<div className="flex items-center gap-4">
{/* Warcraft III Top Resources indicators */}
{gameState && activeTeam !== 'spectator' && gameState.players[activeTeam] && (() => {
const pState = gameState.players[activeTeam]!;
return (
<div className="w3-resource-container mr-2 hidden md:flex">
<div className="w3-resource-badge text-amber-400" title="Gold Treasury (Income rate)">
<span>🪙</span>
<span className="font-mono">{Math.floor(pState.gold)}g</span>
<span className="text-[10px] text-emerald-400">({pState.income > 0 ? `+${pState.income}` : pState.income})</span>
</div>
<div className="w3-resource-badge text-sky-450" title="Mana Tech Points">
<span>🧪</span>
<span className="font-mono">{Math.floor(pState.mana)} MP</span>
</div>
</div>
);
})()}

{/* Connection Diagnostics Badge */}
<div className="flex items-center gap-1.5 text-xs">
{isConnected ? (
<span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1 border border-emerald-500/20 rounded-full font-bold">
<Wifi className="w-3.5 h-3.5" />
Live Sync
</span>
) : (
<span className="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-3 py-1 border border-rose-500/20 rounded-full font-bold animate-pulse">
<WifiOff className="w-3.5 h-3.5" />
Disconnected
</span>
)}
</div>

<button
onClick={() => setShowInstructions(!showInstructions)}
className="text-slate-400 hover:text-slate-100 transition-colors text-xs flex items-center gap-1.5 cursor-pointer font-bold"
>
<HelpCircle className="w-4 h-4" />
<span>Guide Checklist</span>
</button>

<button
onClick={() => {
if (socket) socket.close();
setIsJoined(false);
setGameState(null);
}}
className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-350 border border-rose-900/40 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
>
<WifiOff className="w-3.5 h-3.5 mr-0.5" />
<span>Leave Arena</span>
</button>
</div>
</div>
</header>

{/* Primary Grid Layout container */}
<main className="max-w-[1920px] mx-auto px-4 py-4 space-y-4 app-shell-scroll">

{/* 3. GAMEPLAY DISPLAY CANVAS SCREEN & CENTRAL STATE METRICS HUD */}
{gameState ? (
<div className="grid gap-3 animate-fade-in">

{/* 3A. LOBBY GAME MODE SELECTION OVERLAY */}
{gameState.status === 'lobby' && (
<div className="w3-lobby-overlay">
<div className="w3-leaves-frame max-w-[1200px] w-full w3-modal-stone space-y-4">
<h3 className="text-center font-w3-title text-xl text-amber-500 font-extrabold uppercase tracking-widest border-b border-slate-800 pb-3">
Game Mode Selection
</h3>
{activeTeam === 1 ? (
<div className="space-y-4 font-w3-medieval">
<p className="text-xs text-slate-355 text-center leading-relaxed">
As the Citadel Warlord, select the battle rules for this match:
</p>
<div className="space-y-3">
<button 
onClick={() => handleSendAction({ type: 'select_mode', mode: 'random' })} 
className="w3-button-stone text-[#22c55e] hover:text-[#4ade80]"
>
Random (All options ON)
</button>
<button 
onClick={() => handleSendAction({ type: 'select_mode', mode: 'all_pick' })} 
className="w3-button-stone text-[#eab308] hover:text-[#facc15]"
>
All Pick (All options ON)
</button>
<button 
onClick={() => handleSendAction({ type: 'select_mode', mode: 'no_neutrals' })} 
className="w3-button-stone text-[#f97316] hover:text-[#fb923c]"
>
No Neutrals (Neutral Buildings OFF)
</button>
<button 
onClick={() => handleSendAction({ type: 'select_mode', mode: 'fast_start' })} 
className="w3-button-stone text-[#a855f7] hover:text-[#c084fc]"
>
Fast Start (+1000g, +100 mana start)
</button>
<button 
onClick={() => handleSendAction({ type: 'select_mode', mode: 'russian_roulette' })} 
className="w3-button-stone text-[#3b82f6] hover:text-[#60a5fa]"
>
Russian Roulette (Fatal ticks chance)
</button>
<button 
onClick={() => handleSendAction({ type: 'select_mode', mode: 'minimal' })} 
className="w3-button-stone text-[#ef4444] hover:text-[#f87171]"
>
Minimal (No spells, heroes, or neutrals)
</button>
</div>
</div>
) : (
<div className="text-center space-y-4 py-6 font-w3-medieval">
<div className="w-10 h-10 border-4 border-t-amber-500 border-r-transparent border-slate-800 rounded-full animate-spin mx-auto" />
<p className="text-slate-350 text-xs font-semibold">
Waiting for host (Player 1) to select Game Mode...
</p>
</div>
)}
</div>
</div>
)}

{/* 3B. RACE SELECTION OVERLAY */}
{gameState.status === 'race_selection' && (
<div className="w3-lobby-overlay">
<div className="w3-leaves-frame max-w-[1680px] w-full w3-modal-stone grid grid-cols-1 md:grid-cols-12 gap-4 p-4 font-w3-medieval max-h-[calc(100vh-140px)] overflow-hidden">
{/* Left Column: Grid Selector (col-span-7) */}
<div className="md:col-span-7 space-y-4">
<div className="border-b border-slate-800 pb-2 flex justify-between items-center">
<h3 className="font-w3-title text-base text-amber-500 uppercase tracking-widest font-black">
Select Your Race
</h3>
<span className="text-[10px] text-slate-500 font-mono">Use keys [Q-V] to pick</span>
</div>

<div className="grid grid-cols-4 gap-3">
{Object.keys(RACE_INFO).map((raceKey) => {
const race = raceKey as RaceType;
const rInfo = RACE_INFO[race];
const isSelected = selectedRace === race;
const isMyRace = gameState.players[activeTeam as 1|2|3|4]?.race === race;
const isLocked = gameState.players[activeTeam as 1|2|3|4]?.raceLocked;

// Map race keys to hotkey labels:
const hotkeysMap: Record<RaceType, string> = {
human: 'Q', orc: 'W', demon: 'E', night_elf: 'R',
dwarf: 'A', troll: 'S', undead: 'D', naga: 'F',
mercenary: 'Z', tauren: 'X', fel_orc: 'C', blood_elf: 'V'
};
const hotkey = hotkeysMap[race];

// Set custom styling classes
let portraitClass = "w3-race-portrait relative p-2 flex flex-col justify-end text-center ";
if (isSelected) portraitClass += "w3-race-portrait-selected border-amber-500 shadow-md shadow-amber-500/10 ";
if (isMyRace) portraitClass += "w3-race-portrait-selected border-emerald-500 ";

// Emoji avatars mapping
const avatars: Record<RaceType, string> = {
human: '🛡️', orc: '🪓', demon: '😈', night_elf: '🧝',
dwarf: '🧔', troll: '👹', undead: '💀', naga: '🧜',
mercenary: '💰', tauren: '🐂', fel_orc: '👺', blood_elf: '🩸'
};

return (
<div
key={race}
onMouseEnter={() => setHoveredRace(race)}
onClick={() => {
if (!isLocked && activeTeam !== 'spectator') {
setSelectedRace(race);
handleSendAction({ type: 'select_race', race });
}
}}
className={portraitClass}
>
<span className="w3-key-badge">{hotkey}</span>
<div className="text-3xl mb-2">{avatars[race]}</div>
<span className="text-[10px] font-black text-slate-200 uppercase truncate max-w-full">
{rInfo.name.split(' - ')[1]}
</span>
<span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">
{rInfo.faction}
</span>
</div>
);
})}
</div>
</div>

{/* Right Column: Faction details & Lock In button (col-span-5) */}
<div className="md:col-span-5 flex flex-col justify-between bg-slate-950/50 border border-slate-850 p-4 rounded-xl">
{(() => {
const displayedRace = hoveredRace || selectedRace;
const rInfo = RACE_INFO[displayedRace];
const isLocked = gameState.players[activeTeam as 1|2|3|4]?.raceLocked;

return (
<div className="space-y-4 flex-1 flex flex-col justify-between">
<div className="space-y-3">
<div className="border-b border-slate-850 pb-2">
<p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{rInfo.faction.toUpperCase()} COALITION</p>
<h4 className="font-w3-title text-lg font-black text-amber-500 uppercase leading-none mt-1">
{rInfo.name}
</h4>
<p className={`text-[10px] font-bold mt-1.5 uppercase`}>
Difficulty: <span className={`text-difficulty-${rInfo.difficulty.toLowerCase()}`}>{rInfo.difficulty}</span>
</p>
</div>

<div className="space-y-2 text-xs leading-relaxed text-slate-300">
<div>
<span className="font-bold text-amber-450">Units:</span>
<p className="text-[11px] text-slate-400">
{displayedRace === 'demon' && '+12% damage, +30% cost'}
{displayedRace === 'dwarf' && '+2 armor, -10% attack rate'}
{displayedRace === 'tauren' && '+15% hit points, -10% attack rate'}
{displayedRace === 'fel_orc' && '+10% attack rate, -2 armor'}
{displayedRace === 'night_elf' && '+1.5 HP/sec regeneration'}
{displayedRace === 'human' && '+5% attack rate'}
{displayedRace === 'mercenary' && '-30% cost, -50% summon cooldown'}
{displayedRace === 'naga' && '+2 armor, +50% summon cooldown'}
{displayedRace === 'orc' && '+12% damage'}
{displayedRace === 'blood_elf' && '+4% Evasion, -20% spell cost, -12% damage, -10% hit points'}
{displayedRace === 'undead' && '-30% cost, -50% summon cooldown, -12% damage, -2 armor'}
{displayedRace === 'troll' && '+4% Evasion'}
</p>
</div>
<div>
<span className="font-bold text-amber-450">Buildings:</span>
<p className="text-[11px] text-slate-400">
{displayedRace === 'demon' && '+1 HP/sec regeneration'}
{displayedRace === 'dwarf' && '+10% hit points'}
{displayedRace === 'tauren' && '+20% damage'}
{displayedRace === 'fel_orc' && '+100 attack range'}
{displayedRace === 'night_elf' && '+1 HP/sec regeneration'}
{displayedRace === 'human' && '+1 armor'}
{displayedRace === 'mercenary' && '+100 attack range'}
{displayedRace === 'naga' && '+1 armor, -10% hit points'}
{displayedRace === 'orc' && '+20% damage'}
{displayedRace === 'blood_elf' && '+12.5% mana regeneration rate'}
{displayedRace === 'undead' && '+12.5% mana regeneration rate'}
{displayedRace === 'troll' && '+10% hit points'}
</p>
</div>
<div>
<span className="font-bold text-amber-450">Upgrades:</span>
<p className="text-[11px] text-slate-400">
{displayedRace === 'demon' && '+3Lv Building Damage, +10% cost'}
{displayedRace === 'dwarf' && '+2Lv Building Armor, -1 Lv Magic'}
{displayedRace === 'tauren' && '+3Lv Melee Weapons'}
{displayedRace === 'fel_orc' && '+10% research speed (-10% cost)'}
{displayedRace === 'night_elf' && '+3Lv Building Damage, -20% research speed (+20% cost)'}
{displayedRace === 'human' && '+3Lv Unit Armor'}
{displayedRace === 'mercenary' && '+3Lv Unit Damage, -3Lv Unit Armor'}
{displayedRace === 'naga' && '+3Lv Unit Armor'}
{displayedRace === 'orc' && '+2Lv Building Armor'}
{displayedRace === 'blood_elf' && '+1Lv Magic'}
{displayedRace === 'undead' && '-5% upgrade cost'}
{displayedRace === 'troll' && '+3Lv Ranged Weapons'}
</p>
</div>
<div className="pt-1 border-t border-slate-900">
<span className="font-bold text-amber-450">Traits:</span>
<p className="text-[10.5px] text-slate-400 leading-tight italic">
"{rInfo.traits}"
</p>
</div>
</div>

<div className="pt-4">
{isLocked ? (
<div className="text-center py-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-emerald-450 text-xs font-black uppercase tracking-widest animate-pulse">
🔒 Faction Locked In
</div>
) : activeTeam === 'spectator' ? (
<div className="text-center py-3 bg-slate-900 border border-slate-850 rounded-xl text-slate-500 text-xs font-bold uppercase">
Spectating Race Selection
</div>
) : (
<button
type="button"
onClick={() => handleSendAction({ type: 'confirm_race' })}
className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-550 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/10 cursor-pointer"
>
<span>LOCK IN ALLEGIANCE</span>
</button>
)}
</div>
</div>
</div>
);
})()}
</div>
</div>
</div>
)}

<div className="flex flex-col gap-4 items-center max-w-[1200px] mx-auto w-full">
{/* Top Control Bar & Stats */}
<div className="w-full flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl backdrop-blur-sm">
<div className="flex flex-wrap items-center gap-3">
<div className="px-3 py-1.5 bg-slate-950/85 border border-slate-800 rounded-lg">
<p className="text-[9px] text-slate-450 uppercase font-bold tracking-wider leading-none">Battle Arena</p>
<p className="text-xs font-mono font-black text-indigo-400 uppercase leading-none mt-1">{gameState.lobbyId}</p>
</div>
<div className="px-3 py-1.5 bg-slate-950/85 border border-slate-800 rounded-lg">
<p className="text-[9px] text-slate-450 uppercase font-bold tracking-wider leading-none">Elapsed Time</p>
<p className="text-xs font-mono font-black text-slate-200 leading-none mt-1">{formatTimer(gameState.gameTime)}</p>
</div>
<div className="px-3 py-1.5 bg-slate-950/85 border border-slate-800 rounded-lg">
<p className="text-[9px] text-slate-450 uppercase font-bold tracking-wider leading-none">Deployment Countdown</p>
<p className="text-xs font-mono font-black text-indigo-450 leading-none mt-1">{getSecondsToWave()} seconds</p>
</div>
</div>

<div className="flex items-center gap-2">
{/* Volume Controller Slider */}
<div className="flex items-center gap-2 bg-slate-950/85 border border-slate-800 rounded-lg px-3 py-1.5 text-xs select-none">
<span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Volume:</span>
<input
type="range"
min="0"
max="100"
value={Math.round(volume * 100)}
onChange={(e) => {
const newVol = parseFloat(e.target.value) / 100;
setVolume(newVol);
soundManager.setVolume(newVol);
}}
className="w-16 md:w-20 accent-indigo-500 h-1 rounded bg-slate-850 cursor-pointer"
/>
<span className="font-mono text-indigo-400 font-bold text-[10px] w-6 text-right">{Math.round(volume * 100)}%</span>
</div>
<button
type="button"
onClick={handleToggleAi}
className={`inline-flex h-9 items-center gap-2 rounded-xl border border-slate-700 px-3 text-xs font-bold transition-colors cursor-pointer ${
gameState.isAiEnabled ? 'bg-indigo-600/90 text-white' : 'bg-slate-900/90 text-slate-300'
}`}
>
<Bot className="w-4 h-4" />
<span>AI Control</span>
</button>
<button
onClick={handleRestartMatch}
className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-3 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-800 cursor-pointer"
>
<RefreshCw className="w-3.5 h-3.5 text-slate-300" />
<span>Restart Match</span>
</button>
</div>
</div>

{/* Game Map Canvas (centered and square) */}
<div className="w-full flex justify-center">
<GameCanvas
gameState={gameState}
activeTeam={activeTeam}
selectedTowerId={selectedTowerId}
onSelectTower={setSelectedTowerId}
/>
</div>

{/* Bottom Console: Team Status & Game Dashboard side-by-side */}
<div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
{/* Team Status Cards */}
<div className="lg:col-span-4 grid grid-cols-2 gap-2 w-full">
{teamArray.map(t => {
const info = FACTION_INFO[t];
const tower = gameState.towers.find(tow => tow.id === `castle-${t}`);
const isAlive = tower && tower.hp > 0;
const hp = tower ? tower.hp : 0;
const maxHp = tower ? tower.maxHp : 1;
const hpPct = Math.max(0, hp / maxHp);
const playerState = gameState.players[t];
const playerNameLabel = playerState ? playerState.name : `Vacant (${info.faction})`;

return (
<div
key={t}
className="p-3 bg-slate-950/85 border rounded-xl backdrop-blur-sm flex flex-col justify-between"
style={{ borderColor: isAlive ? `${info.color}35` : '#1e293b' }}
>
<div className="flex items-center justify-between gap-1">
<span className="text-[9px] font-bold uppercase text-slate-300 truncate">{info.name}</span>
<span className="text-[8px] font-bold text-slate-500 uppercase shrink-0">T{t}</span>
</div>
<div className="mt-2">
<div className="flex justify-between items-center text-[9px] leading-none mb-1 font-mono">
<span className="text-slate-400 truncate pr-1 max-w-[65%]">{playerNameLabel}</span>
<span className="font-semibold text-slate-200 shrink-0">{isAlive ? `${hp}/${maxHp}` : 'DESTROYED'}</span>
</div>
<div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-850">
<div className="h-full transition-all duration-300" style={{ width: `${hpPct * 100}%`, backgroundColor: info.color }} />
</div>
</div>
</div>
);
})}
</div>

{/* Dashboard Operations Console */}
<div className="lg:col-span-8 w-full">
<GameDashboard
gameState={gameState}
activeTeam={activeTeam}
selectedTowerId={selectedTowerId}
onSendAction={handleSendAction}
onSelectTower={setSelectedTowerId}
selectedLane={selectedLane}
onChangeLane={setSelectedLane}
/>
</div>
</div>
</div>
</div>
) : (
<div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-xl space-y-4">
<div className="w-10 h-10 border-4 border-t-indigo-500 border-r-transparent border-slate-800 rounded-full animate-spin mx-auto" />
<p className="text-slate-400 text-xs font-semibold">Waiting for the game server session to load...</p>
</div>
)}

{/* 4. DRAMATIC VICTORY OR DEFEAT OVERLAY SCREEN */}
{gameState && gameState.status === 'ended' && (
<div className="fixed inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
<div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-6">

<div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto shadow-inner">
<Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
</div>

<div className="space-y-1">
<h3 className="font-extrabold text-2xl tracking-tight text-white uppercase font-sans">
CONQUEST COMPLETED!
</h3>
<p className="text-slate-400 text-xs">Total destruction was successfully achieved in the arena.</p>
</div>

{/* Winner results */}
<div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
<p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Arena Victorious Faction</p>
{gameState.winnerTeam ? (
<>
<p className="text-lg font-black uppercase mt-1" style={{ color: FACTION_INFO[gameState.winnerTeam].color }}>
{FACTION_INFO[gameState.winnerTeam].name.toUpperCase()}
</p>
<p className="text-slate-400 text-[11px] mt-1.5 italic font-sans">
"{gameState.winnerTeam === activeTeam ? 'All competing fiefdoms have crumbled before your glory!' : 'The enemy shattered your defenses.'}"
</p>
</>
) : (
<p className="text-sm font-bold text-slate-200 mt-1">MUTUAL ABSOLUTE ERADICATION</p>
)}
</div>

{/* Action restart */}
<div className="flex items-center gap-3">
<button
type="button"
onClick={handleRestartMatch}
className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md border border-indigo-400/20 cursor-pointer"
>
<RefreshCw className="w-4 h-4" />
<span>Start a New Battle</span>
</button>
</div>
</div>
</div>
)}
</main>
</div>
);
}
