// 📝 PATCH NOTES REMINDER: If you change rendering, camera behaviour, or add visual features,
// add an entry to the TOP of src/patchNotes.ts describing the change.
import React, { useRef, useEffect, useState } from 'react';
import { GameState, Tower, Unit, LaneType } from '../types';
import { MAP_WIDTH, MAP_HEIGHT, CASTLE_COORDS, FACTION_INFO } from '../engine';
import { soundManager } from '../audio';

interface GameCanvasProps {
gameState: GameState;
activeTeam: 1 | 2 | 3 | 4 | 'spectator';
selectedTowerId: string | null;
onSelectTower: (towerId: string | null) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
gameState,
activeTeam,
selectedTowerId,
onSelectTower
}) => {
const canvasRef = useRef<HTMLCanvasElement | null>(null);
const isDraggingRef = useRef(false);
const dragStartRef = useRef<{ x: number; y: number; cameraX: number; cameraY: number } | null>(null);
const viewStateRef = useRef({ zoom: 1.35, cameraX: MAP_WIDTH / 2, cameraY: MAP_HEIGHT / 2 });
const [viewState, setViewState] = useState(viewStateRef.current);
const [hoveredEntity, setHoveredEntity] = useState<{
name: string;
hp: number;
maxHp: number;
team: 1 | 2 | 3 | 4;
type?: string;
atk?: number;
range?: number;
} | null>(null);

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getViewport = () => {
const canvas = canvasRef.current;
if (!canvas) {
return { width: 800, height: 800 };
}
return { width: canvas.width || 800, height: canvas.height || 800 };
};

const clientToWorld = (clientX: number, clientY: number) => {
const canvas = canvasRef.current;
if (!canvas) return { x: 0, y: 0 };
const rect = canvas.getBoundingClientRect();
const viewport = getViewport();
const px = ((clientX - rect.left) / rect.width) * viewport.width;
const py = ((clientY - rect.top) / rect.height) * viewport.height;
return {
x: (px - viewport.width / 2) / viewStateRef.current.zoom + viewStateRef.current.cameraX,
y: (py - viewport.height / 2) / viewStateRef.current.zoom + viewStateRef.current.cameraY
};
};

const updateCamera = (next: Partial<typeof viewStateRef.current>) => {
viewStateRef.current = { ...viewStateRef.current, ...next };
setViewState(viewStateRef.current);
};

// Drawing loop
useEffect(() => {
const canvas = canvasRef.current;
if (!canvas) return;

const ctx = canvas.getContext('2d');
if (!ctx) return;

// Sync camera coordinates with the audio manager for spatial audio calculations
soundManager.setCamera(viewState.cameraX, viewState.cameraY, viewState.zoom);

const mapStyle = gameState.settings?.mapStyle || 'cosmic';
const { zoom, cameraX, cameraY } = viewState;
const viewport = getViewport();

ctx.save();
ctx.setTransform(1, 0, 0, 1, 0, 0);
ctx.clearRect(0, 0, canvas.width, canvas.height);
ctx.restore();

// Clear background with rich themed space/scene
if (mapStyle === 'woods') {
ctx.fillStyle = '#0f1f13'; // deep forest dark emerald shade
} else if (mapStyle === 'desert') {
ctx.fillStyle = '#1c140d'; // dark dust dunes sand shade
} else {
ctx.fillStyle = '#0b0f19'; // cosmic slate dark space
}
ctx.save();
ctx.translate(viewport.width / 2, viewport.height / 2);
ctx.scale(zoom, zoom);
ctx.translate(-cameraX, -cameraY);

ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

// Draw cosmic stars or organic details
if (mapStyle === 'woods') {
ctx.fillStyle = 'rgba(74, 222, 128, 0.15)'; // drifting forest spores
} else if (mapStyle === 'desert') {
ctx.fillStyle = 'rgba(251, 191, 36, 0.12)'; // wind swept sand spec
} else {
ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // cosmic stars
}
for (let i = 0; i < 50; i++) {
const x = (Math.sin(i * 3824) * 0.5 + 0.5) * MAP_WIDTH;
const y = (Math.cos(i * 7492) * 0.5 + 0.5) * MAP_HEIGHT;
ctx.fillRect(x, y, 1.5, 1.5);
}

// Draw grid lines
if (mapStyle === 'woods') {
ctx.strokeStyle = 'rgba(34, 197, 94, 0.08)';
} else if (mapStyle === 'desert') {
ctx.strokeStyle = 'rgba(217, 119, 6, 0.08)';
} else {
ctx.strokeStyle = 'rgba(51, 65, 85, 0.15)'; // subtle grid
}
ctx.lineWidth = 1;
for (let x = 0; x < MAP_WIDTH; x += 50) {
ctx.beginPath();
ctx.moveTo(x, 0);
ctx.lineTo(x, MAP_HEIGHT);
ctx.stroke();
}
for (let y = 0; y < MAP_HEIGHT; y += 50) {
ctx.beginPath();
ctx.moveTo(0, y);
ctx.lineTo(MAP_WIDTH, y);
ctx.stroke();
}

// Draw the 6 symmetric lane pathways connecting the 4 headquarters
ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
ctx.lineWidth = 30;

const paths = [
[CASTLE_COORDS[1], CASTLE_COORDS[2]], // West <-> East
[CASTLE_COORDS[3], CASTLE_COORDS[4]], // North <-> South
[CASTLE_COORDS[1], CASTLE_COORDS[3]], // West <-> North
[CASTLE_COORDS[1], CASTLE_COORDS[4]], // West <-> South
[CASTLE_COORDS[2], CASTLE_COORDS[3]], // East <-> North
[CASTLE_COORDS[2], CASTLE_COORDS[4]], // East <-> South
];

// Draw thick background lane shadows
paths.forEach(p => {
ctx.beginPath();
ctx.moveTo(p[0].x, p[0].y);
ctx.lineTo(p[1].x, p[1].y);
ctx.stroke();
});

// Draw thin glowing dash overlays
ctx.strokeStyle = 'rgba(234, 179, 8, 0.12)'; // gentle gold lane guide
ctx.lineWidth = 1.5;
ctx.setLineDash([8, 12]);
paths.forEach(p => {
ctx.beginPath();
ctx.moveTo(p[0].x, p[0].y);
ctx.lineTo(p[1].x, p[1].y);
ctx.stroke();
});
ctx.setLineDash([]); // reset

// Draw glow spots inside map center (championship clash zone)
ctx.fillStyle = 'rgba(234, 179, 8, 0.04)';
ctx.beginPath();
ctx.arc(MAP_WIDTH / 2, MAP_HEIGHT / 2, 110, 0, Math.PI * 2);
ctx.fill();

// Draw territory background gradients for all 4 factions (Checklist Tier 1)
// Bottom-Left Base 1 (Alliance Royal Blue)
const c1 = CASTLE_COORDS[1];
let grad1 = ctx.createRadialGradient(c1.x, c1.y, 10, c1.x, c1.y, 160);
grad1.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
grad1.addColorStop(1, 'rgba(59, 130, 246, 0)');
ctx.fillStyle = grad1;
ctx.beginPath();
ctx.arc(c1.x, c1.y, 165, 0, Math.PI * 2);
ctx.fill();

// Top-Left Base 2 (Shadow Legion Red)
const c2 = CASTLE_COORDS[2];
let grad2 = ctx.createRadialGradient(c2.x, c2.y, 10, c2.x, c2.y, 160);
grad2.addColorStop(0, 'rgba(239, 110, 110, 0.15)');
grad2.addColorStop(1, 'rgba(239, 110, 110, 0)');
ctx.fillStyle = grad2;
ctx.beginPath();
ctx.arc(c2.x, c2.y, 165, 0, Math.PI * 2);
ctx.fill();

// Top-Right Base 3 (Plague Scourge Purple)
const c3 = CASTLE_COORDS[3];
let grad3 = ctx.createRadialGradient(c3.x, c3.y, 10, c3.x, c3.y, 160);
grad3.addColorStop(0, 'rgba(168, 85, 247, 0.15)');
grad3.addColorStop(1, 'rgba(168, 85, 247, 0)');
ctx.fillStyle = grad3;
ctx.beginPath();
ctx.arc(c3.x, c3.y, 165, 0, Math.PI * 2);
ctx.fill();

// Bottom-Right Base 4 (Iron Horde Green)
const c4 = CASTLE_COORDS[4];
let grad4 = ctx.createRadialGradient(c4.x, c4.y, 10, c4.x, c4.y, 160);
grad4.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
grad4.addColorStop(1, 'rgba(16, 185, 129, 0)');
ctx.fillStyle = grad4;
ctx.beginPath();
ctx.arc(c4.x, c4.y, 165, 0, Math.PI * 2);
ctx.fill();

// Draw the 4 Quadrant Divider boundaries (Highly Authentic 2x2 grid from user map inspiration red lines)
ctx.strokeStyle = 'rgba(239, 68, 68, 0.22)'; // beautiful low-contrast subtle battleground red
ctx.lineWidth = 2;
ctx.setLineDash([4, 4]);

// Vertical partition
ctx.beginPath();
ctx.moveTo(MAP_WIDTH / 2, 0);
ctx.lineTo(MAP_WIDTH / 2, MAP_HEIGHT);
ctx.stroke();

// Horizontal partition
ctx.beginPath();
ctx.moveTo(0, MAP_HEIGHT / 2);
ctx.lineTo(MAP_WIDTH, MAP_HEIGHT / 2);
ctx.stroke();
ctx.setLineDash([]); // reset

// Draw sector names at quadrants
ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
ctx.font = 'bold 10px monospace';
ctx.textAlign = 'center';
ctx.fillText('QUADRANT II [TOP-LEFT]', MAP_WIDTH / 4, 40);
ctx.fillText('QUADRANT III [TOP-RIGHT]', (3 * MAP_WIDTH) / 4, 40);
ctx.fillText('QUADRANT I [BOTTOM-LEFT]', MAP_WIDTH / 4, MAP_HEIGHT - 30);
ctx.fillText('QUADRANT IV [BOTTOM-RIGHT]', (3 * MAP_WIDTH) / 4, MAP_HEIGHT - 30);

// DRAW THE TOWERS & CASTLES
gameState.towers.forEach(tower => {
const isCastle = tower.lane === 'castle';
const size = tower.size;
const fInfo = FACTION_INFO[tower.team];

// Draw high priority select outline ring if selected
if (selectedTowerId === tower.id) {
ctx.strokeStyle = '#f59e0b'; // amber select line
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(tower.x, tower.y, size + 8, 0, Math.PI * 2);
ctx.stroke();

ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
ctx.lineWidth = 3.5;
ctx.beginPath();
const pulseR = size + 8 + Math.sin(Date.now() / 140) * 3;
ctx.arc(tower.x, tower.y, pulseR, 0, Math.PI * 2);
ctx.stroke();
}

// Outer defense fortress ring base style
ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
ctx.strokeStyle = fInfo.color;
ctx.lineWidth = 3;
ctx.beginPath();
ctx.arc(tower.x, tower.y, size, 0, Math.PI * 2);
ctx.fill();
ctx.stroke();

// Inner magical defensive core core
ctx.fillStyle = fInfo.color;
ctx.beginPath();
ctx.arc(tower.x, tower.y, size - 7, 0, Math.PI * 2);
ctx.fill();

// Mini level overlay indicator
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 9px Inter, system-ui';
ctx.textAlign = 'center';
ctx.fillText(`Lvl ${tower.level}`, tower.x, tower.y + 3);

// Sledge HP Bar Indicator
const barW = size * 1.8;
const barH = 4.5;
const barX = tower.x - barW / 2;
const barY = tower.y - size - 12;

ctx.fillStyle = '#020617';
ctx.fillRect(barX, barY, barW, barH);
const pct = Math.max(0, tower.hp / tower.maxHp);
ctx.fillStyle = fInfo.color;
ctx.fillRect(barX, barY, barW * pct, barH);

// Minimal labeling
ctx.fillStyle = '#94a3b8';
ctx.font = '8px Inter, system-ui';
ctx.fillText(isCastle ? 'Headquarters' : 'Lane Post', tower.x, barY - 4);
});

// DRAW THE NEUTRAL BUILDINGS
if (gameState.neutralBuildings) {
gameState.neutralBuildings.forEach(nb => {
const size = nb.size;
const isCaptured = nb.ownerTeam !== null;
const color = isCaptured ? FACTION_INFO[nb.ownerTeam!].color : '#64748b';

// 1. Draw dynamic outline glow rings if capturing
const totalProgress = (Object.values(nb.captureProgress) as number[]).reduce((a, b) => a + b, 0);
if (totalProgress > 0) {
const capturingTeam = ([1, 2, 3, 4] as const).find(t => nb.captureProgress[t] > 0);
if (capturingTeam) {
ctx.strokeStyle = FACTION_INFO[capturingTeam].color;
ctx.lineWidth = 2;
ctx.beginPath();
const pulseR = size + 8 + Math.sin(Date.now() / 120) * 3;
ctx.arc(nb.x, nb.y, pulseR, 0, Math.PI * 2);
ctx.stroke();
}
}

// 2. Main structure base
ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
ctx.strokeStyle = color;
ctx.lineWidth = 3.5;
ctx.beginPath();
ctx.arc(nb.x, nb.y, size, 0, Math.PI * 2);
ctx.fill();
ctx.stroke();

// Inner glowing core
ctx.fillStyle = isCaptured ? `${color}30` : 'rgba(71, 85, 105, 0.15)';
ctx.beginPath();
ctx.arc(nb.x, nb.y, size - 4, 0, Math.PI * 2);
ctx.fill();

// 3. Draw Themed Symbol Emojis representing the building types
ctx.fillStyle = '#ffffff';
ctx.font = '14px Inter, system-ui';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
let symbol = '🏯';
let label = 'Neutral node';

switch (nb.type) {
case 'gold_mine':
symbol = '🪙';
label = isCaptured ? `${FACTION_INFO[nb.ownerTeam!].name} Mine` : 'Gold Mine';
break;
case 'gem_mine':
symbol = '💎';
label = isCaptured ? `${FACTION_INFO[nb.ownerTeam!].name} Gems` : 'Gem Mine';
break;
case 'lumber_mill':
symbol = '🪵';
label = isCaptured ? `${FACTION_INFO[nb.ownerTeam!].name} Mill` : 'Lumber Mill';
break;
case 'war_mill':
symbol = '🪓';
label = isCaptured ? `${FACTION_INFO[nb.ownerTeam!].name} War Mill` : 'War Mill';
break;
case 'forge':
symbol = '🛡️';
label = isCaptured ? `${FACTION_INFO[nb.ownerTeam!].name} Forge` : 'Forge';
break;
case 'stone_quarry':
symbol = '🧱';
label = isCaptured ? `${FACTION_INFO[nb.ownerTeam!].name} Quarry` : 'Stone Quarry';
break;
case 'marketplace':
symbol = '⚖️';
label = isCaptured ? `${FACTION_INFO[nb.ownerTeam!].name} Market` : 'Marketplace';
break;
case 'tavern':
symbol = '🍻';
label = isCaptured ? `${FACTION_INFO[nb.ownerTeam!].name} Tavern` : 'Tavern';
break;
case 'goblin_laboratory':
symbol = '🧪';
label = isCaptured ? `${FACTION_INFO[nb.ownerTeam!].name} Lab` : 'Goblin Lab';
break;
case 'fountain_of_mana':
symbol = '⛲';
label = isCaptured ? `${FACTION_INFO[nb.ownerTeam!].name} Fountain` : 'Fountain of Mana';
break;
case 'sacrificial_altar':
symbol = '🔥';
label = isCaptured ? `${FACTION_INFO[nb.ownerTeam!].name} Altar` : 'Sacrificial Altar';
break;
case 'workshop':
symbol = '⚙️';
label = isCaptured ? `${FACTION_INFO[nb.ownerTeam!].name} Workshop` : 'Workshop';
break;
case 'metal_mine':
symbol = '💰';
label = isCaptured ? `${FACTION_INFO[nb.ownerTeam!].name} Metal Mine` : 'Metal Mine';
break;
}

ctx.fillText(symbol, nb.x, nb.y);

// Reset textBaseline
ctx.textBaseline = 'alphabetic';

// 4. Capture Progress Bar above the building
if (totalProgress > 0) {
const capTeam = ([1, 2, 3, 4] as const).find(t => nb.captureProgress[t] > 0);
if (capTeam) {
const pct = Math.min(1.0, nb.captureProgress[capTeam] / 120);
const barW = size * 1.8;
const barH = 4;
const barX = nb.x - barW / 2;
const barY = nb.y - size - 12;

ctx.fillStyle = '#020617';
ctx.fillRect(barX, barY, barW, barH);
ctx.fillStyle = FACTION_INFO[capTeam].color;
ctx.fillRect(barX, barY, barW * pct, barH);
}
}

// 5. Owner tag/banner label
ctx.fillStyle = isCaptured ? color : '#94a3b8';
ctx.font = 'bold 7.5px Inter, system-ui';
ctx.textAlign = 'center';
ctx.fillText(label.toUpperCase(), nb.x, nb.y - size - 4);
});
}

// DRAW THE ACTIVE WAVE UNITS
gameState.units.forEach(unit => {
const uColor = FACTION_INFO[unit.team].color;
const size = unit.size;
const isAir = unit.type === 'air';
const drawX = unit.x;
const drawY = isAir ? unit.y - 18 : unit.y;

// Draw shadow for flying units on the ground
if (isAir) {
ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
ctx.beginPath();
ctx.arc(unit.x, unit.y, size * 0.8, 0, Math.PI * 2);
ctx.fill();
}

// Draw specialized gold circle aura for faction primary Heroes
if (unit.isHero) {
ctx.strokeStyle = '#eab308';
ctx.lineWidth = 2.5;
ctx.beginPath();
ctx.arc(drawX, drawY, size + 5, 0, Math.PI * 2);
ctx.stroke();

ctx.fillStyle = 'rgba(234, 179, 8, 0.16)';
ctx.beginPath();
ctx.arc(drawX, drawY, size + 5, 0, Math.PI * 2);
ctx.fill();
}

// Main unit container frame
ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
ctx.strokeStyle = uColor;
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(drawX, drawY, size, 0, Math.PI * 2);
ctx.fill();
ctx.stroke();

// Center glowing weapon seed
ctx.fillStyle = uColor;
ctx.beginPath();
ctx.arc(drawX, drawY, size - 3.5, 0, Math.PI * 2);
ctx.fill();

// Class-specific visual shapes for quick RTS macro identifying
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 1;
ctx.beginPath();
if (unit.type === 'melee') {
// Draw Shield Cross
ctx.moveTo(drawX - 3, drawY - 3);
ctx.lineTo(drawX + 3, drawY + 3);
ctx.moveTo(drawX + 3, drawY - 3);
ctx.lineTo(drawX - 3, drawY + 3);
} else if (unit.type === 'ranged') {
// Bowman Arc
ctx.arc(drawX, drawY, 3, 0, Math.PI);
} else if (unit.type === 'mage') {
// Arcane circle core
ctx.fillStyle = '#ffffff';
ctx.arc(drawX, drawY, 2.2, 0, Math.PI * 2);
ctx.fill();
} else if (unit.type === 'siege') {
// Heavy steel square tank outline
ctx.rect(drawX - 3.5, drawY - 3.5, 7, 7);
} else if (unit.type === 'skeleton') {
// Little crossbones or dot
ctx.fillStyle = '#f8fafc';
ctx.arc(drawX, drawY, 1.8, 0, Math.PI * 2);
ctx.fill();
} else if (unit.type === 'mounted') {
// Mounted cross symbol
ctx.moveTo(drawX - 4, drawY);
ctx.lineTo(drawX + 4, drawY);
ctx.moveTo(drawX, drawY - 4);
ctx.lineTo(drawX, drawY + 4);
} else if (unit.type === 'air') {
// Wing line shapes
ctx.moveTo(drawX - 5, drawY - 2);
ctx.lineTo(drawX, drawY + 2);
ctx.lineTo(drawX + 5, drawY - 2);
}
ctx.stroke();

// HP Slider Bar above unit
const hpPct = Math.max(0, unit.hp / unit.maxHp);
const barW = size * 1.6;
const barH = 3;
const barX = drawX - barW / 2;
const barY = drawY - size - 7;

ctx.fillStyle = '#0f172a';
ctx.fillRect(barX, barY, barW, barH);
ctx.fillStyle = uColor;
ctx.fillRect(barX, barY, barW * hpPct, barH);
});

// DRAW PROJECTILES
gameState.projectiles.forEach(p => {
ctx.strokeStyle = p.color;
ctx.fillStyle = p.color;
ctx.lineWidth = 3.5;

ctx.beginPath();
const dx = p.targetX - p.startX;
const dy = p.targetY - p.startY;
const dist = Math.sqrt(dx * dx + dy * dy);
if (dist > 5) {
// elegant laser projectile tail
const headX = p.currentX;
const headY = p.currentY;
const ratio = 14 / dist;
const tailX = headX - dx * ratio;
const tailY = headY - dy * ratio;

ctx.moveTo(headX, headY);
ctx.lineTo(tailX, tailY);
ctx.stroke();
} else {
ctx.arc(p.currentX, p.currentY, 4.5, 0, Math.PI * 2);
ctx.fill();
}
});

// DRAW THE MAGIC SPELL CAST VISUAL EFFECTS
gameState.effects.forEach(fx => {
ctx.save();
const pct = fx.timer / fx.maxTimer;

if (fx.type === 'meteor') {
// Large ring of fire splash
ctx.beginPath();
ctx.fillStyle = `rgba(239, 68, 68, ${pct * 0.28})`;
ctx.arc(fx.x, fx.y, 100, 0, Math.PI * 2);
ctx.fill();

ctx.strokeStyle = fx.color;
ctx.lineWidth = 2.5;
ctx.beginPath();
ctx.arc(fx.x, fx.y, 100 * (1 - pct), 0, Math.PI * 2);
ctx.stroke();
} 

else if (fx.type === 'explosion') {
ctx.fillStyle = fx.color;
ctx.beginPath();
ctx.arc(fx.x, fx.y, 30 * (1 - pct), 0, Math.PI * 2);
ctx.fill();
} 

else if (fx.type === 'heal') {
ctx.strokeStyle = fx.color;
ctx.lineWidth = 1.5;
for (let i = 0; i < 4; i++) {
const sx = fx.x + Math.sin(i * 142) * 12;
const sy = fx.y - (1 - pct) * 45 + (i * 6);
ctx.beginPath();
ctx.moveTo(sx, sy);
ctx.lineTo(sx, sy - 8);
ctx.stroke();
}
} 

else if (fx.type === 'lightning') {
ctx.strokeStyle = fx.color;
ctx.lineWidth = 3.5 * pct;
if (fx.targetX !== undefined && fx.targetY !== undefined) {
ctx.beginPath();
ctx.moveTo(fx.x, fx.y);

const midX = (fx.x + fx.targetX) / 2;
const midY = (fx.y + fx.targetY) / 2;
const px = -(fx.targetY - fx.y) * 0.16 * Math.sin(Date.now() / 15);
const py = (fx.targetX - fx.x) * 0.16 * Math.sin(Date.now() / 15);

ctx.lineTo(midX + px, midY + py);
ctx.lineTo(fx.targetX, fx.targetY);
ctx.stroke();
}
} 

else if (fx.type === 'slash') {
ctx.strokeStyle = fx.color;
ctx.lineWidth = 2.5;
ctx.beginPath();
ctx.arc(fx.x, fx.y, 12, -Math.PI / 4, Math.PI * 0.75);
ctx.stroke();
}

else if (fx.type === 'scourge_dead') {
// Raise undead skeleton particle cloud
ctx.fillStyle = `rgba(168, 85, 247, ${pct * 0.35})`;
ctx.beginPath();
ctx.arc(fx.x, fx.y, 25 * (1 - pct), 0, Math.PI * 2);
ctx.fill();
}

else if (fx.type === 'bloodlust') {
// Screaming red speed rings
ctx.strokeStyle = `rgba(16, 185, 129, ${pct * 0.8})`;
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(fx.x, fx.y, 20 * (1 - pct), 0, Math.PI * 2);
ctx.stroke();
}
ctx.restore();
});

// DRAW FLOATING TEXT METRICS OVERLAY
gameState.floatingTexts.forEach(txt => {
ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
ctx.font = txt.text.includes('+') || txt.text.includes('Hero') || txt.text.includes('WAVES') ? 'bold 11px Inter' : '9px Inter';
ctx.textAlign = 'center';

ctx.fillText(txt.text, txt.x + 1, txt.y + 1);
ctx.fillStyle = txt.color;
ctx.fillText(txt.text, txt.x, txt.y);
});

// Frame canvas boundary contours
ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
ctx.lineWidth = 2;
ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

// Wave timer bar indicators at very top of card
const wavePercentage = Math.max(0, gameState.waveTimer / gameState.maxWaveTimer);
ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
ctx.fillRect(0, 0, MAP_WIDTH, 6);
ctx.fillStyle = '#8b5cf6'; // royal purple wave meter
ctx.fillRect(0, 0, MAP_WIDTH * (1 - wavePercentage), 6);

ctx.restore();

}, [gameState, selectedTowerId, activeTeam]);

// Click handler to select and inspect structures
const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
const canvas = canvasRef.current;
if (!canvas) return;

const { x: clickX, y: clickY } = clientToWorld(e.clientX, e.clientY);

let foundTower: Tower | null = null;
gameState.towers.forEach(t => {
const dist = Math.sqrt((t.x - clickX) ** 2 + (t.y - clickY) ** 2);
if (dist <= t.size + 15) {
foundTower = t;
}
});

if (foundTower) {
onSelectTower((foundTower as Tower).id);
} else {
onSelectTower(null);
}
};

// Hover tracker to display inspection overlay HUD
const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
const canvas = canvasRef.current;
if (!canvas) return;

if (isDraggingRef.current) return;
const { x: hoverX, y: hoverY } = clientToWorld(e.clientX, e.clientY);

let hovered: any = null;

gameState.units.forEach(u => {
const dist = Math.sqrt((u.x - hoverX) ** 2 + (u.y - hoverY) ** 2);
if (dist <= u.size + 12) {
hovered = {
name: u.name,
hp: u.hp,
maxHp: u.maxHp,
team: u.team,
type: u.type,
atk: u.atk,
range: u.range
};
}
});

if (!hovered) {
gameState.towers.forEach(t => {
const dist = Math.sqrt((t.x - hoverX) ** 2 + (t.y - hoverY) ** 2);
if (dist <= t.size + 15) {
hovered = {
name: t.lane === 'castle' ? `${FACTION_INFO[t.team].name} Fortress` : `${FACTION_INFO[t.team].name} Defense Post`,
hp: t.hp,
maxHp: t.maxHp,
team: t.team,
type: 'Sentry Tower Structure',
atk: t.atk,
range: t.range
};
}
});
}

if (!hovered && gameState.neutralBuildings) {
gameState.neutralBuildings.forEach(nb => {
const dist = Math.sqrt((nb.x - hoverX) ** 2 + (nb.y - hoverY) ** 2);
if (dist <= nb.size + 15) {
let name = 'Neutral Structure';
let desc = 'Capture to receive special bonuses';

switch (nb.type) {
case 'gold_mine':
name = nb.ownerTeam ? `${FACTION_INFO[nb.ownerTeam].name} Gold Mine` : 'Neutral Gold Mine';
desc = 'Generates +12g/sec passive gold directly to owner';
break;
case 'gem_mine':
name = nb.ownerTeam ? `${FACTION_INFO[nb.ownerTeam].name} Gem Mine` : 'Neutral Gem Mine';
desc = 'Generates +2 MP/sec passive mana to owner';
break;
case 'lumber_mill':
name = nb.ownerTeam ? `${FACTION_INFO[nb.ownerTeam].name} Lumber Mill` : 'Neutral Lumber Mill';
desc = 'Heals owner towers and fortress for +3 HP/sec';
break;
case 'war_mill':
name = nb.ownerTeam ? `${FACTION_INFO[nb.ownerTeam].name} War Mill` : 'Neutral War Mill';
desc = 'Increases all owner units damage by +12%';
break;
case 'forge':
name = nb.ownerTeam ? `${FACTION_INFO[nb.ownerTeam].name} Forge` : 'Neutral Forge';
desc = 'Grants +2 flat armor protection to all owner units';
break;
case 'stone_quarry':
name = nb.ownerTeam ? `${FACTION_INFO[nb.ownerTeam].name} Stone Quarry` : 'Neutral Stone Quarry';
desc = 'Grants +4 flat armor protection to owner towers/fortress';
break;
case 'marketplace':
name = nb.ownerTeam ? `${FACTION_INFO[nb.ownerTeam].name} Marketplace` : 'Neutral Marketplace';
desc = 'Increases owner Hero damage by +25% and armor by +5';
break;
case 'tavern':
name = nb.ownerTeam ? `${FACTION_INFO[nb.ownerTeam].name} Tavern` : 'Neutral Tavern';
desc = 'Increases owner units attack rate by +15%';
break;
case 'goblin_laboratory':
name = nb.ownerTeam ? `${FACTION_INFO[nb.ownerTeam].name} Goblin Laboratory` : 'Neutral Goblin Laboratory';
desc = 'Reduces all enemy units armor by -2 (flat)';
break;
case 'fountain_of_mana':
name = nb.ownerTeam ? `${FACTION_INFO[nb.ownerTeam].name} Fountain of Mana` : 'Neutral Fountain of Mana';
desc = 'Increases owner castle mana regeneration rate by +20%';
break;
case 'sacrificial_altar':
name = nb.ownerTeam ? `${FACTION_INFO[nb.ownerTeam].name} Sacrificial Altar` : 'Neutral Sacrificial Altar';
desc = 'Reduces all enemy units damage by -10%';
break;
case 'workshop':
name = nb.ownerTeam ? `${FACTION_INFO[nb.ownerTeam].name} Workshop` : 'Neutral Workshop';
desc = 'Increases all owner towers/fortress damage by +20%';
break;
case 'metal_mine':
name = nb.ownerTeam ? `${FACTION_INFO[nb.ownerTeam].name} Metal Mine` : 'Neutral Metal Mine';
desc = 'Increases owner passive income rate by +10 gold';
break;
}

hovered = {
name,
hp: nb.ownerTeam ? 100 : 0,
maxHp: 100,
team: nb.ownerTeam || 1,
type: 'Neutral Capture Structure',
atk: nb.ownerTeam ? 15 : 0,
range: 120,
stats: desc
};
}
});
}

setHoveredEntity(hovered);
};

const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
if (e.button !== 0) return;
isDraggingRef.current = true;
dragStartRef.current = {
x: e.clientX,
y: e.clientY,
cameraX: viewStateRef.current.cameraX,
cameraY: viewStateRef.current.cameraY
};
};

const handleMouseUp = () => {
isDraggingRef.current = false;
dragStartRef.current = null;
};

const handleMouseMoveDrag = (e: React.MouseEvent<HTMLCanvasElement>) => {
if (isDraggingRef.current && dragStartRef.current) {
const canvas = canvasRef.current;
if (!canvas) return;
const rect = canvas.getBoundingClientRect();
const viewport = getViewport();
const dx = ((e.clientX - dragStartRef.current.x) / rect.width) * viewport.width / viewStateRef.current.zoom;
const dy = ((e.clientY - dragStartRef.current.y) / rect.height) * viewport.height / viewStateRef.current.zoom;
updateCamera({
cameraX: clamp(dragStartRef.current.cameraX - dx, viewport.width / (2 * viewStateRef.current.zoom), MAP_WIDTH - viewport.width / (2 * viewStateRef.current.zoom)),
cameraY: clamp(dragStartRef.current.cameraY - dy, viewport.height / (2 * viewStateRef.current.zoom), MAP_HEIGHT - viewport.height / (2 * viewStateRef.current.zoom))
});
return;
}
handleMouseMove(e);
};

const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
e.preventDefault();
const delta = e.deltaY > 0 ? -0.08 : 0.08;
const nextZoom = clamp(viewStateRef.current.zoom + delta, 0.9, 2.0);
updateCamera({ zoom: nextZoom });
};

return (
<div className="relative border border-slate-800 bg-slate-950 rounded-xl overflow-hidden shadow-2xl min-h-0 max-w-[560px] lg:max-w-[620px] mx-auto">
<canvas
id="survival-chaos-canvas-4p"
ref={canvasRef}
width={MAP_WIDTH}
height={MAP_HEIGHT}
onClick={handleCanvasClick}
onMouseDown={handleMouseDown}
onMouseUp={handleMouseUp}
onMouseMove={handleMouseMoveDrag}
onMouseLeave={() => { setHoveredEntity(null); handleMouseUp(); }}
onWheel={handleWheel}
onContextMenu={(e) => e.preventDefault()}
className="w-full aspect-square block cursor-grab active:cursor-grabbing touch-none"
/>

{/* Floating Tactical Inspection Panel HUD in canvas absolute corner */}
{hoveredEntity && (
<div className="absolute top-4 left-4 p-3 bg-slate-950/95 border border-slate-800 text-slate-100 text-xs rounded-lg shadow-xl pointer-events-none min-w-[200px] animate-fade-in backdrop-blur-md">
<div className="font-semibold text-sm border-b border-slate-800 pb-1.5 mb-1.5 flex items-center gap-2">
<span
className="w-3.5 h-3.5 rounded-full inline-block border border-white/20"
style={{ backgroundColor: FACTION_INFO[hoveredEntity.team].color }}
/>
<span>{hoveredEntity.name}</span>
</div>
<div className="space-y-1 text-[11px] text-slate-300">
<p className="flex justify-between">
<span>Stamina HP:</span>
<span className="font-mono font-semibold text-emerald-400">
{hoveredEntity.hp}/{hoveredEntity.maxHp}
</span>
</p>
{hoveredEntity.type && (
<p className="flex justify-between">
<span>Class Class:</span>
<span className="font-semibold capitalize text-purple-400">{hoveredEntity.type}</span>
</p>
)}
{hoveredEntity.atk && (
<p className="flex justify-between">
<span>Damage power:</span>
<span className="font-mono text-amber-400">{hoveredEntity.atk} raw</span>
</p>
)}
{hoveredEntity.range && (
<p className="flex justify-between">
<span>Target Range:</span>
<span className="font-mono text-cyan-400">{hoveredEntity.range}px</span>
</p>
)}
<p className="text-[10px] text-center text-slate-400 mt-2 font-semibold pt-1 border-t border-slate-900 border-dashed" style={{ color: FACTION_INFO[hoveredEntity.team].color }}>
Faction: {FACTION_INFO[hoveredEntity.team].name}
</p>
</div>
</div>
)}

<div className="absolute bottom-3 right-3 px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-300 shadow-lg pointer-events-none">
Zoom {Math.round(viewState.zoom * 100)}% | Drag to pan | Wheel to zoom
</div>
</div>
);
};
