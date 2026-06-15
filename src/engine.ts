// 📝 PATCH NOTES REMINDER: If you change game logic, balance, units, waves, or map layout,
// add an entry to the TOP of src/patchNotes.ts describing the change.
import { GameState, Unit, Tower, Projectile, VisualEffect, FloatingText, LaneType, UnitType, PlayerAction, PlayerState, GameSettings } from './types';

// Standard 4-player FFA Game Map Dimensions
export const MAP_WIDTH = 1800;
export const MAP_HEIGHT = 1800;

// Symmetric Castle Coordinates for 4 Players (Corners of 4-Quadrant grid)
export const CASTLE_COORDS: Record<1 | 2 | 3 | 4, { x: number; y: number }> = {
1: { x: 200, y: 1600 },  // Bottom-Left Base: Alliance (Blue)
2: { x: 200, y: 200 },  // Top-Left Base: Shadow Legion (Red)
3: { x: 1600, y: 200 },  // Top-Right Base: Plague Scourge (Purple)
4: { x: 1600, y: 1600 }   // Bottom-Right Base: Iron Horde (Green)
};

export const LANE_Y: Record<LaneType, number> = {
top: 450,
middle: 900,
bottom: 1350
};

// Lane Target Layout: Map the 3 lanes (top, middle, bottom) of each player to their target player team
export const TEAM_TARGETS: Record<1 | 2 | 3 | 4, Record<LaneType, 1 | 2 | 3 | 4>> = {
1: { top: 2, middle: 3, bottom: 4 }, // Bottom-Left goes to: Top-Left (2), Top-Right diagonal (3), Bottom-Right (4)
2: { top: 3, middle: 4, bottom: 1 }, // Top-Left goes to: Top-Right (3), Bottom-Right diagonal (4), Bottom-Left (1)
3: { top: 2, middle: 1, bottom: 4 }, // Top-Right goes to: Top-Left (2), Bottom-Left diagonal (1), Bottom-Right (4)
4: { top: 3, middle: 2, bottom: 1 }  // Bottom-Right goes to: Top-Right (3), Top-Left diagonal (2), Bottom-Left (1)
};

export function isLaneCompatible(team1: number, lane1: string, team2: number, lane2: string): boolean {
if (lane1 === lane2) return true;

// Left vertical lane (Team 1 top <-> Team 2 bottom)
if (
(team1 === 1 && lane1 === 'top' && team2 === 2 && lane2 === 'bottom') ||
(team1 === 2 && lane1 === 'bottom' && team2 === 1 && lane2 === 'top')
) {
return true;
}

// Right vertical lane (Team 3 bottom <-> Team 4 top)
if (
(team1 === 3 && lane1 === 'bottom' && team2 === 4 && lane2 === 'top') ||
(team1 === 4 && lane1 === 'top' && team2 === 3 && lane2 === 'bottom')
) {
return true;
}

return false;
}

export const FACTION_INFO: Record<1 | 2 | 3 | 4, { name: string; faction: PlayerState['faction']; color: string; heroName: string }> = {
1: { name: 'Royal Alliance', faction: 'alliance', color: '#3b82f6', heroName: 'Grand Marshal Garithos' },
2: { name: 'Shadow Legion', faction: 'legion', color: '#ef4444', heroName: 'Pit Lord Azgalor' },
3: { name: 'Plague Scourge', faction: 'scourge', color: '#a855f7', heroName: 'Lich Kel\'Thuzad' },
4: { name: 'Iron Horde', faction: 'horde', color: '#10b981', heroName: 'Warlord Grommash' }
};

import { RaceType, GameModeType } from './types';

export const RACE_INFO: Record<RaceType, {
name: string;
faction: 'alliance' | 'legion' | 'scourge' | 'horde';
color: string;
heroName: string;
difficulty: 'Beginner' | 'Advanced' | 'Skilled' | 'Expert';
traits: string;
units: Record<UnitType, string>;
}> = {
human: {
name: 'Alliance - Human',
faction: 'alliance',
color: '#3b82f6',
heroName: 'Grand Marshal Garithos',
difficulty: 'Beginner',
traits: 'Jacks of all trades but masters of none. Very basic and simple, but versatile and adaptive. Good in every situation, foolproof and idiotfriendly. Easy to play and very boring. Recommended for total Noobs.',
units: {
melee: 'Shield Footman',
ranged: 'Elven Archer',
mage: 'Spell Binder',
siege: 'Steam Tank',
hero: 'Grand Marshal Garithos',
mounted: 'Royal Knight',
air: 'Gryphon Rider',
skeleton: 'Risen Servant'
}
},
orc: {
name: 'The Horde - Orc',
faction: 'horde',
color: '#10b981',
heroName: 'Warlord Grommash',
difficulty: 'Skilled',
traits: 'Basic at a first glance, but actually far more tricky to play. Easy to learn, but difficult to master. Very buff and aura dependent race. Augments troop damage output with blind rage and frenzy.',
units: {
melee: 'Orc Raider',
ranged: 'Troll Hunter',
mage: 'Horde Shaman',
siege: 'Iron Demolisher',
hero: 'Warlord Grommash',
mounted: 'Orc Wolf Rider',
air: 'Troll Batrider',
skeleton: 'Risen Servant'
}
},
demon: {
name: 'Chaos - Demon',
faction: 'legion',
color: '#ef4444',
heroName: 'Pit Lord Azgalor',
difficulty: 'Beginner',
traits: 'Extremely powerful with no real weaknesses. Demons reign in their realm virtually unchallenged. Luckily this is not their realm and keeping dimensional portals open for the supplylines is very expensive.',
units: {
melee: 'Felbane Guard',
ranged: 'Succubus Archer',
mage: 'Legion Warlock',
siege: 'Sulphur Cannon',
hero: 'Pit Lord Azgalor',
mounted: 'Hellhound Rider',
air: 'Nether Dragon',
skeleton: 'Risen Servant'
}
},
night_elf: {
name: 'The Ancients - Night Elf',
faction: 'alliance',
color: '#a855f7',
heroName: 'Priestess Tyrande',
difficulty: 'Skilled',
traits: 'Dedicated and specialized units, trained to fulfil their role to the max. Balanced and strong race without apparent weaknesses. Its full potential is impressive but it rises slowly and can be hard to reach.',
units: {
melee: 'Sentinel Footman',
ranged: 'Archer',
mage: 'Druid of the Claw',
siege: 'Glaive Thrower',
hero: 'Priestess Tyrande',
mounted: 'Mountain Giant',
air: 'Hippogryph Rider',
skeleton: 'Risen Servant'
}
},
dwarf: {
name: 'Alliance - Dwarf',
faction: 'alliance',
color: '#3b82f6',
heroName: 'Thane Muradin',
difficulty: 'Advanced',
traits: 'What they lack in magic and spells, Dwarves make it up in their ingenuity. Weak starting units, but powerful late game mechanical contraptions that are resistant to most magic effects.',
units: {
melee: 'Mountain Defender',
ranged: 'Rifleman',
mage: 'Runesmith',
siege: 'Steam Engine',
hero: 'Thane Muradin',
mounted: 'Ram Rider',
air: 'Gryphon Bombardier',
skeleton: 'Risen Servant'
}
},
troll: {
name: 'The Horde - Troll',
faction: 'horde',
color: '#10b981',
heroName: 'Vol\'jin Shadow',
difficulty: 'Skilled',
traits: 'Why so serious? Come and have a smoke with us! Fragile in early game, unpredictable in late game. Debilitates and confuses enemy. You won\'t win all games, but you will have fun in every single one.',
units: {
melee: 'Headhunter',
ranged: 'Shadow Hunter',
mage: 'Witch Doctor',
siege: 'Troll Catapult',
hero: 'Vol\'jin Shadow',
mounted: 'Raptor Rider',
air: 'Batrider',
skeleton: 'Risen Servant'
}
},
undead: {
name: 'Chaos - Undead',
faction: 'scourge',
color: '#a855f7',
heroName: 'Lich Kel\'Thuzad',
difficulty: 'Advanced',
traits: 'Quantity over quality. Most units are very weak and depend on high numbers rather than strength. But then there also are few damage soakers like Flesh Giant, Frost Wyrm or The Lich King.',
units: {
melee: 'Plague Ghoul',
ranged: 'Crypt Ranger',
mage: 'Necromancer',
siege: 'Plague Wagon',
hero: 'Lich Kel\'Thuzad',
mounted: 'Skeletal Knight',
air: 'Frost Wyrm',
skeleton: 'Risen Servant'
}
},
naga: {
name: 'The Ancients - Naga',
faction: 'scourge',
color: '#06b6d4',
heroName: 'Lady Vashj',
difficulty: 'Skilled',
traits: 'Strong race, proficient in ancient arcane arts and magic neutralization. Yet it struggles to establish foothold on surface world. Unit supply is limited and buildings lack solid foundations.',
units: {
melee: 'Myrmidon',
ranged: 'Naga Archer',
mage: 'Siren',
siege: 'Snap Dragon',
hero: 'Lady Vashj',
mounted: 'Turtle Rider',
air: 'Couatl',
skeleton: 'Risen Servant'
}
},
mercenary: {
name: 'Alliance - Mercenary',
faction: 'alliance',
color: '#eab308',
heroName: 'Mercenary Warlord',
difficulty: 'Expert',
traits: 'Cheap and abundant units with significant battle experience. Trained to fight without any honour and show no mercy. But there is a limit what skill can do and the lack of high quality gear has its toll.',
units: {
melee: 'Bandit Rogue',
ranged: 'Crossbowman',
mage: 'Assassin',
siege: 'Goblin Shredder',
hero: 'Mercenary Warlord',
mounted: 'Hawk Rider',
air: 'Goblin Zeppelin',
skeleton: 'Risen Servant'
}
},
tauren: {
name: 'The Horde - Tauren',
faction: 'horde',
color: '#10b981',
heroName: 'Chieftain Cairne',
difficulty: 'Advanced',
traits: 'Slow and steady wins the race! It is not about dealing damage, its about outliving enemy. Damage output rises slowly and peaks in late game. It depends on brute force and so cannot be denied or dispelled.',
units: {
melee: 'Tauren Warlord',
ranged: 'Spirit Javelin',
mage: 'Spirit Walker',
siege: 'Kodo Beast',
hero: 'Chieftain Cairne',
mounted: 'Wyvern Rider',
air: 'Sky Eagle',
skeleton: 'Risen Servant'
}
},
fel_orc: {
name: 'Chaos - Fel Orc',
faction: 'legion',
color: '#ef4444',
heroName: 'Chaos Lord',
difficulty: 'Skilled',
traits: 'Its more about making your enemies weaker than increasing your own strength. Lots of debilitating effects susceptible to buff dispels. Overfocused on offence and thus lacking in defence.',
units: {
melee: 'Fel Orc Grunt',
ranged: 'Fel Raider',
mage: 'Warlock',
siege: 'Demonic Demolisher',
hero: 'Chaos Lord',
mounted: 'Fel Wolf Rider',
air: 'Fel Bat',
skeleton: 'Risen Servant'
}
},
blood_elf: {
name: 'The Ancients - Blood Elf',
faction: 'legion',
color: '#fb7185',
heroName: 'Prince Kael\'thas',
difficulty: 'Expert',
traits: 'Glass cannons. Extremely weak starting units. Very fragile even in late game. Heavily relies on special upgrades inside towers. Delivers short outbursts of damage. Strong against buff dependent races.',
units: {
melee: 'Spellbreaker',
ranged: 'Elven Ranger',
mage: 'Blood Mage',
siege: 'Phoenix Cannon',
hero: 'Prince Kael\'thas',
mounted: 'Dragonhawk Rider',
air: 'Phoenix',
skeleton: 'Risen Servant'
}
}
};

export function getUpgradeLevelCap(upgradeType: 'meleeAtk' | 'rangedAtk' | 'magicAtk' | 'defense' | 'masonry', race: RaceType, gameMode?: GameModeType | null): number {
if (gameMode === 'minimal') return 5;
let cap = 5;
if (upgradeType === 'meleeAtk') {
if (race === 'tauren' || race === 'mercenary') cap += 3;
} else if (upgradeType === 'rangedAtk') {
if (race === 'troll' || race === 'mercenary') cap += 3;
} else if (upgradeType === 'magicAtk') {
if (race === 'blood_elf') cap += 1;
if (race === 'dwarf') cap -= 1;
if (race === 'mercenary') cap += 3;
} else if (upgradeType === 'defense') {
if (race === 'human' || race === 'naga') cap += 3;
if (race === 'mercenary') cap -= 3;
} else if (upgradeType === 'masonry') {
if (race === 'demon' || race === 'night_elf') cap += 3;
if (race === 'orc' || race === 'dwarf') cap += 2;
}
return cap;
}

export const DEFAULT_SETTINGS: GameSettings = {
startingGold: 240,
startingMana: 20,
waveInterval: 900, // 15s wave interval
aiDifficulty: 'moderate',
gameSpeedMultiplier: 1.0,
heroesEnabled: true,
spellsEnabled: true,
specialUnitsEnabled: true,
startingIncome: 24,
factionBonusMultiplier: 1.0,
castleVictoryHp: 4000,
mapStyle: 'cosmic'
};

export function hasCapturedNode(state: GameState, team: number, type: string): boolean {
if (!state.neutralBuildings) return false;
return state.neutralBuildings.some(nb => nb.ownerTeam === team && nb.type === type);
}

export const NEUTRAL_TYPES: (
| 'gold_mine'
| 'lumber_mill'
| 'forge'
| 'tavern'
| 'gem_mine'
| 'war_mill'
| 'stone_quarry'
| 'marketplace'
| 'goblin_laboratory'
| 'fountain_of_mana'
| 'sacrificial_altar'
| 'workshop'
| 'metal_mine'
)[] = [
'gold_mine',
'lumber_mill',
'forge',
'tavern',
'gem_mine',
'war_mill',
'stone_quarry',
'marketplace',
'goblin_laboratory',
'fountain_of_mana',
'sacrificial_altar',
'workshop',
'metal_mine'
];

// Initial state creator
export function createInitialState(
lobbyId: string = 'sandbox',
isAiEnabled = true,
customSettings?: Partial<GameSettings>
): GameState {
const settings: GameSettings = { ...DEFAULT_SETTINGS, ...customSettings };

// Symmetrically pick 8 random distinct types
const shuffledTypes = [...NEUTRAL_TYPES].sort(() => Math.random() - 0.5);
const selectedTypes = shuffledTypes.slice(0, 8);

const symmetricPositions = [
{ x: 300, y: 600 },   // Top-Left Upper
{ x: 600, y: 300 },   // Top-Right Left
{ x: 1200, y: 300 },  // Top-Right Right
{ x: 1500, y: 600 },  // Bottom-Right Upper
{ x: 1500, y: 1200 }, // Bottom-Right Lower
{ x: 1200, y: 1500 }, // Bottom-Left Right
{ x: 600, y: 1500 },  // Bottom-Left Left
{ x: 300, y: 1200 }   // Top-Left Lower
];

const neutralBuildings = symmetricPositions.map((pos, idx) => ({
id: `nb-${idx + 1}`,
type: selectedTypes[idx],
x: pos.x,
y: pos.y,
ownerTeam: null as (1 | 2 | 3 | 4 | null),
captureProgress: { 1: 0, 2: 0, 3: 0, 4: 0 },
size: 28
}));

const state: GameState = {
units: [],
towers: [],
players: {
1: createPlayerState('Player 1', 1, settings),
2: createPlayerState(isAiEnabled ? 'CPU Bot Red' : 'Player 2', 2, settings),
3: createPlayerState(isAiEnabled ? 'CPU Bot Scourge' : 'Player 3', 3, settings),
4: createPlayerState(isAiEnabled ? 'CPU Bot Iron' : 'Player 4', 4, settings)
},
projectiles: [],
effects: [],
floatingTexts: [],
waveTimer: 600, // 10 seconds till the first automated battle wave
maxWaveTimer: settings.waveInterval, // subsequent waves
gameTime: 0,
status: 'lobby',
gameMode: null,
winnerTeam: null,
lobbyId,
isAiEnabled,
settings,
neutralBuildings
};

// Add Castles & Tower defenses symmetrically
const teams: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
teams.forEach(t => {
const coords = CASTLE_COORDS[t];
const p = state.players[t];
if (p) {
if (t === 1) p.gold += 120; // Alliance guild chest (old default)
}

const pRace = p?.race || (t === 1 ? 'human' : t === 2 ? 'demon' : t === 3 ? 'undead' : 'orc');

// Modifiers for towers
let castleHp = settings.castleVictoryHp;
let castleAtk = 50;
let castleRange = 170;

if (pRace === 'dwarf' || pRace === 'troll') castleHp = Math.floor(castleHp * 1.1);
if (pRace === 'naga') castleHp = Math.floor(castleHp * 0.9);
if (pRace === 'tauren' || pRace === 'orc') castleAtk = Math.floor(castleAtk * 1.2);
if (pRace === 'fel_orc' || pRace === 'mercenary') castleRange += 100;

// 1. Central Fortress Castle
state.towers.push({
id: `castle-${t}`,
lane: 'castle',
team: t,
x: coords.x,
y: coords.y,
hp: castleHp,
maxHp: castleHp,
atk: castleAtk,
range: castleRange,
level: 1,
atkCooldown: 0,
maxAtkCooldown: 36,
targetId: null,
size: 42
});

let defenseHp = 1600;
let defenseAtk = 28;
let defenseRange = 150;

if (pRace === 'dwarf' || pRace === 'troll') defenseHp = Math.floor(defenseHp * 1.1);
if (pRace === 'naga') defenseHp = Math.floor(defenseHp * 0.9);
if (pRace === 'tauren' || pRace === 'orc') defenseAtk = Math.floor(defenseAtk * 1.2);
if (pRace === 'fel_orc' || pRace === 'mercenary') defenseRange += 100;

// 2. Lane Protective towers (3 towers situated in front of each base guarding its lanes)
if (t === 1) { // Bottom-Left Base
state.towers.push({ id: 't-1-top', lane: 'top', team: 1, x: 200, y: 1300, hp: defenseHp, maxHp: defenseHp, atk: defenseAtk, range: defenseRange, level: 1, atkCooldown: 0, maxAtkCooldown: 42, targetId: null, size: 24 });
state.towers.push({ id: 't-1-middle', lane: 'middle', team: 1, x: 410, y: 1390, hp: defenseHp, maxHp: defenseHp, atk: defenseAtk, range: defenseRange, level: 1, atkCooldown: 0, maxAtkCooldown: 42, targetId: null, size: 24 });
state.towers.push({ id: 't-1-bottom', lane: 'bottom', team: 1, x: 500, y: 1600, hp: defenseHp, maxHp: defenseHp, atk: defenseAtk, range: defenseRange, level: 1, atkCooldown: 0, maxAtkCooldown: 42, targetId: null, size: 24 });
} else if (t === 2) { // Top-Left Base
state.towers.push({ id: 't-2-top', lane: 'top', team: 2, x: 500, y: 200, hp: defenseHp, maxHp: defenseHp, atk: defenseAtk, range: defenseRange, level: 1, atkCooldown: 0, maxAtkCooldown: 42, targetId: null, size: 24 });
state.towers.push({ id: 't-2-middle', lane: 'middle', team: 2, x: 410, y: 410, hp: defenseHp, maxHp: defenseHp, atk: defenseAtk, range: defenseRange, level: 1, atkCooldown: 0, maxAtkCooldown: 42, targetId: null, size: 24 });
state.towers.push({ id: 't-2-bottom', lane: 'bottom', team: 2, x: 200, y: 500, hp: defenseHp, maxHp: defenseHp, atk: defenseAtk, range: defenseRange, level: 1, atkCooldown: 0, maxAtkCooldown: 42, targetId: null, size: 24 });
} else if (t === 3) { // Top-Right Base
state.towers.push({ id: 't-3-top', lane: 'top', team: 3, x: 1300, y: 200, hp: defenseHp, maxHp: defenseHp, atk: defenseAtk, range: defenseRange, level: 1, atkCooldown: 0, maxAtkCooldown: 42, targetId: null, size: 24 });
state.towers.push({ id: 't-3-middle', lane: 'middle', team: 3, x: 1390, y: 410, hp: defenseHp, maxHp: defenseHp, atk: defenseAtk, range: defenseRange, level: 1, atkCooldown: 0, maxAtkCooldown: 42, targetId: null, size: 24 });
state.towers.push({ id: 't-3-bottom', lane: 'bottom', team: 3, x: 1600, y: 500, hp: defenseHp, maxHp: defenseHp, atk: defenseAtk, range: defenseRange, level: 1, atkCooldown: 0, maxAtkCooldown: 42, targetId: null, size: 24 });
} else if (t === 4) { // Bottom-Right Base
state.towers.push({ id: 't-4-top', lane: 'top', team: 4, x: 1600, y: 1300, hp: defenseHp, maxHp: defenseHp, atk: defenseAtk, range: defenseRange, level: 1, atkCooldown: 0, maxAtkCooldown: 42, targetId: null, size: 24 });
state.towers.push({ id: 't-4-middle', lane: 'middle', team: 4, x: 1390, y: 1390, hp: defenseHp, maxHp: defenseHp, atk: defenseAtk, range: defenseRange, level: 1, atkCooldown: 0, maxAtkCooldown: 42, targetId: null, size: 24 });
state.towers.push({ id: 't-4-bottom', lane: 'bottom', team: 4, x: 1300, y: 1600, hp: defenseHp, maxHp: defenseHp, atk: defenseAtk, range: defenseRange, level: 1, atkCooldown: 0, maxAtkCooldown: 42, targetId: null, size: 24 });
}
});

return state;
}

export function createPlayerState(
name: string,
team: 1 | 2 | 3 | 4,
settings: GameSettings = DEFAULT_SETTINGS
): PlayerState {
const factionList: PlayerState['faction'][] = ['alliance', 'legion', 'scourge', 'horde'];
const faction = factionList[team - 1];

const raceList: RaceType[] = ['human', 'demon', 'undead', 'orc'];
const race = raceList[team - 1];

return {
id: `player-${team}`,
team,
name,
faction,
race,
raceLocked: false,
gold: settings.startingGold, // Base starting budget
mana: settings.startingMana, // Tactical spell capital points
income: settings.startingIncome, // Starting passive salary stream
incomeUpgradeCost: 90,
barracksLevel: {
top: 1,
middle: 1,
bottom: 1
},
summonCooldown: {
top: 0,
middle: 0,
bottom: 0
},
heroSummoned: false,
heroCooldown: 0,
ultimateResearched: false,
research: {
meleeAtk: 0,
rangedAtk: 0,
magicAtk: 0,
defense: 0,
masonry: 0
}
};
}

// Highly stylized units mapping custom to each of the 22+ lore inspirations
export function createUnit(
team: 1 | 2 | 3 | 4,
lane: LaneType,
type: UnitType,
x: number,
y: number,
bonusMultiplier: number = 1.0,
research?: PlayerState['research'],
race?: RaceType,
gameMode?: GameModeType | null
): Unit {
const targetTeam = TEAM_TARGETS[team][lane];
const id = `unit-${team}-${Math.random().toString(36).substr(2, 9)}`;
const finalRace = race || (team === 1 ? 'human' : team === 2 ? 'demon' : team === 3 ? 'undead' : 'orc');
const rInfo = RACE_INFO[finalRace];

let hp = 400;
let atk = 18;
let range = 25;
let speed = 1.3;
let maxAtkCooldown = 45;
let size = 13;
let name = rInfo.units[type];

// Base Stats by Class
switch (type) {
case 'melee':
hp = 440; atk = 18; range = 26; speed = 1.25; maxAtkCooldown = 45; size = 13;
break;
case 'ranged':
hp = 240; atk = 17; range = 150; speed = 1.15; maxAtkCooldown = 45; size = 11;
break;
case 'mage':
hp = 260; atk = 21; range = 130; speed = 1.05; maxAtkCooldown = 45; size = 11;
break;
case 'siege':
hp = 800; atk = 45; range = 35; speed = 0.8; maxAtkCooldown = 70; size = 19;
break;
case 'hero':
hp = 1900; atk = 65; range = 65; speed = 1.4; maxAtkCooldown = 32; size = 23;
break;
case 'skeleton':
hp = 180; atk = 11; range = 25; speed = 1.35; maxAtkCooldown = 45; size = 9;
break;
case 'mounted':
hp = 550; atk = 22; range = 25; speed = 1.9; maxAtkCooldown = 35; size = 15;
break;
case 'air':
hp = 320; atk = 24; range = 140; speed = 1.4; maxAtkCooldown = 50; size = 12;
break;
}

// Apply Race Multipliers (disabled in minimal mode)
if (gameMode !== 'minimal') {
if (finalRace === 'tauren') {
hp = Math.floor(hp * 1.15);
}
if (finalRace === 'blood_elf') {
hp = Math.floor(hp * 0.9);
}
if (finalRace === 'demon' || finalRace === 'orc') {
atk = Math.floor(atk * 1.12);
}
if (finalRace === 'blood_elf' || finalRace === 'undead') {
atk = Math.floor(atk * 0.88);
}
if (finalRace === 'dwarf' || finalRace === 'tauren') {
maxAtkCooldown = Math.floor(maxAtkCooldown * 1.1);
}
if (finalRace === 'fel_orc') {
maxAtkCooldown = Math.floor(maxAtkCooldown * 0.9);
}
if (finalRace === 'human') {
maxAtkCooldown = Math.floor(maxAtkCooldown * 0.95);
}

// Adjustments based on unique old faction speed/attacks
if (rInfo.faction === 'horde' && type !== 'hero') {
speed *= 1.15; // Horde berserk speed bonus
}
}

// Apply research stat upgrades
if (research) {
if (type === 'melee' || type === 'mounted' || type === 'hero' || type === 'skeleton') {
atk += (research.meleeAtk || 0) * 3;
} else if (type === 'ranged') {
atk += (research.rangedAtk || 0) * 2;
} else if (type === 'mage') {
atk += (research.magicAtk || 0) * 3;
} else if (type === 'air') {
atk += (research.rangedAtk || 0) * 2;
} else if (type === 'siege') {
atk += (research.meleeAtk || 0) * 4;
}
}

hp = Math.floor(hp * bonusMultiplier);
atk = Math.floor(atk * bonusMultiplier);

return {
id,
type,
team,
targetTeam,
lane,
x,
y: y + (Math.random() * 40 - 20), // random offsets to disperse wave overlap nicely
hp,
maxHp: hp,
atk,
range,
speed,
targetId: null,
state: 'moving',
atkCooldown: 0,
maxAtkCooldown,
isHero: type === 'hero',
name,
size
};
}

// Spark helper visuals
function spawnFloatingText(state: GameState, text: string, x: number, y: number, color: string) {
state.floatingTexts.push({
id: `label-${Math.random().toString(36)}`,
text,
x,
y: y - 10,
color,
timer: 48,
maxTimer: 48
});
}

function spawnVisualEffect(state: GameState, type: VisualEffect['type'], x: number, y: number, color: string, targetX?: number, targetY?: number) {
state.effects.push({
id: `eff-${Math.random()}`,
type,
x,
y,
targetX,
targetY,
timer: 22,
maxTimer: 22,
color
});
}

export function finalizeStructures(state: GameState) {
const isMinimal = state.gameMode === 'minimal';

if (state.gameMode === 'no_neutrals' || state.gameMode === 'minimal') {
state.neutralBuildings = [];
}

state.towers.forEach(tow => {
const t = tow.team;
const p = state.players[t];
if (!p) return;

const pRace = p.race;
const isCastle = tow.lane === 'castle';
let baseHp = isCastle ? state.settings.castleVictoryHp : 1600;
let baseAtk = isCastle ? 50 : 28;
let baseRange = isCastle ? 170 : 150;

if (!isMinimal) {
if (pRace === 'dwarf' || pRace === 'troll') baseHp = Math.floor(baseHp * 1.1);
if (pRace === 'naga') baseHp = Math.floor(baseHp * 0.9);
if (pRace === 'tauren' || pRace === 'orc') baseAtk = Math.floor(baseAtk * 1.2);
if (pRace === 'fel_orc' || pRace === 'mercenary') baseRange += 100;
}

tow.maxHp = baseHp;
tow.hp = baseHp;
tow.atk = baseAtk;
tow.range = baseRange;
});
}

// Apply strategic action
export function applyAction(state: GameState, team: 1 | 2 | 3 | 4, action: PlayerAction) {
const p = state.players[team];
if (!p) return;

// Allow select_mode, select_race, and confirm_race outside 'playing' status
if (action.type !== 'select_mode' && action.type !== 'select_race' && action.type !== 'confirm_race') {
if (state.status !== 'playing') return;
}

const castleC = CASTLE_COORDS[team];

switch (action.type) {
case 'select_mode': {
// Only host (Player 1 / team 1) can select game mode in 'lobby' status
if (state.status === 'lobby' && team === 1) {
state.gameMode = action.mode;

// Apply immediate settings adjustments
if (action.mode === 'no_neutrals' || action.mode === 'minimal') {
state.neutralBuildings = [];
}
if (action.mode === 'fast_start') {
const teamsList: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
teamsList.forEach(t => {
const playerState = state.players[t];
if (playerState) {
playerState.gold = 1000;
playerState.mana = 100;
}
});
}
if (action.mode === 'minimal') {
state.settings.heroesEnabled = false;
state.settings.spellsEnabled = false;
state.settings.specialUnitsEnabled = false;
}

// Transition status based on random pick vs all pick modes
const isRandomPick = action.mode === 'random' || action.mode === 'no_neutrals' || action.mode === 'fast_start' || action.mode === 'russian_roulette';
if (isRandomPick) {
// Assign random races and start immediately
const availableRaces: RaceType[] = ['human', 'orc', 'demon', 'night_elf', 'dwarf', 'troll', 'undead', 'naga', 'mercenary', 'tauren', 'fel_orc', 'blood_elf'];
const teamsList: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
teamsList.forEach(t => {
const playerState = state.players[t];
if (playerState) {
const randRace = availableRaces[Math.floor(Math.random() * availableRaces.length)];
playerState.race = randRace;
playerState.raceLocked = true;
}
});

// If Russian Roulette: Only 2 Barracks! (Disable 1 random lane per player)
if (action.mode === 'russian_roulette') {
const lanesList: LaneType[] = ['top', 'middle', 'bottom'];
teamsList.forEach(t => {
const playerState = state.players[t];
if (playerState) {
const disabledLane = lanesList[Math.floor(Math.random() * lanesList.length)];
playerState.barracksLevel[disabledLane] = 0;
}
});
}

finalizeStructures(state);
state.status = 'playing';
} else {
// Transition to race selection (All Pick or Minimal)
state.status = 'race_selection';
// Auto-lock races for CPU bots right away!
const teamsList: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
const availableRaces: RaceType[] = ['human', 'orc', 'demon', 'night_elf', 'dwarf', 'troll', 'undead', 'naga', 'mercenary', 'tauren', 'fel_orc', 'blood_elf'];
teamsList.forEach(t => {
const playerState = state.players[t];
if (playerState) {
const isCpu = playerState.name.includes('CPU') || playerState.name.includes('Bot') || playerState.name.includes('Vacant') || playerState.name.includes('Offline');
if (isCpu) {
const randRace = availableRaces[Math.floor(Math.random() * availableRaces.length)];
playerState.race = randRace;
playerState.raceLocked = true;
}
}
});
}
}
break;
}

case 'select_race': {
if (state.status === 'race_selection') {
const playerState = state.players[team];
if (playerState && !playerState.raceLocked) {
playerState.race = action.race;
}
}
break;
}

case 'confirm_race': {
if (state.status === 'race_selection') {
const playerState = state.players[team];
if (playerState) {
playerState.raceLocked = true;
}

// Check if all human players have locked in
const teamsList: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
let allLocked = true;
teamsList.forEach(t => {
const p = state.players[t];
if (p) {
const isCpu = p.name.includes('CPU') || p.name.includes('Bot') || p.name.includes('Vacant') || p.name.includes('Offline');
if (!isCpu && !p.raceLocked) {
allLocked = false;
}
}
});

if (allLocked) {
finalizeStructures(state);
state.status = 'playing';
}
}
break;
}

case 'upgrade_income':
if (p.gold >= p.incomeUpgradeCost) {
p.gold -= p.incomeUpgradeCost;
p.income += 12;
p.incomeUpgradeCost = Math.floor(p.incomeUpgradeCost * 1.45);
// Display nice floating text and green heal spark
spawnVisualEffect(state, 'heal', castleC.x, castleC.y, '#22c55e');
spawnFloatingText(state, `+12 Income`, castleC.x, castleC.y - 45, '#22c55e');
}
break;

case 'upgrade_barracks': {
const lane = action.lane;
const lvl = p.barracksLevel[lane];
if (lvl === 0 || lvl >= 3) return; // Limit level 3 cap & prevent upgrading disabled barracks

let cost = lvl === 1 ? 160 : 320;
const pRace = p.race;
if (state.gameMode !== 'minimal') {
if (pRace === 'demon') cost = Math.floor(cost * 1.3);
else if (pRace === 'undead' || pRace === 'mercenary') cost = Math.floor(cost * 0.7);
}

if (p.gold >= cost) {
p.gold -= cost;
p.barracksLevel[lane]++;

spawnVisualEffect(state, 'heal', castleC.x, castleC.y, '#3b82f6');
spawnFloatingText(state, `Lane ${lane.toUpperCase()} Lvl ${lvl + 1}`, castleC.x, castleC.y - 50, '#a855f7');
}
break;
}

case 'hire_mercenary': {
if (state.settings && !state.settings.specialUnitsEnabled) {
spawnFloatingText(state, `Mercenaries Disabled`, castleC.x, castleC.y - 45, '#ef4444');
return;
}
const lane = action.lane;
const uType = action.unitType;

if (p.barracksLevel[lane] === 0) return; // Prevent mercenary hiring on disabled lanes

let cost = 50;
if (uType === 'melee') cost = 45;
else if (uType === 'ranged') cost = 60;
else if (uType === 'mage') cost = 85;
else if (uType === 'siege') cost = 135;

const pRace = p.race;
if (pRace === 'demon') cost = Math.floor(cost * 1.3);
else if (pRace === 'undead' || pRace === 'mercenary') cost = Math.floor(cost * 0.7);

if (p.gold >= cost) {
p.gold -= cost;

// Spawn immediate tactical defender right in front of the gate
const targetCastle = CASTLE_COORDS[team];
// push slightly away from base towards map center
const offsetDirectionX = targetCastle.x < (MAP_WIDTH / 2) ? 50 : -50;
const offsetDirectionY = targetCastle.y < (MAP_HEIGHT / 2) ? 50 : -50;

let spawnX = targetCastle.x + (targetCastle.x === (MAP_WIDTH / 2) ? 0 : offsetDirectionX);
let spawnY = targetCastle.y + (targetCastle.y === (MAP_HEIGHT / 2) ? 0 : offsetDirectionY);

const merc = createUnit(team, lane, uType, spawnX, spawnY, state.settings?.factionBonusMultiplier || 1.0, p.research, pRace, state.gameMode);
merc.name = `${pRace.toUpperCase()} Guard`;
merc.hp = Math.floor(merc.hp * 1.15); // boosted mercenary stamina
merc.maxHp = merc.hp;
merc.atk = Math.floor(merc.atk * 1.12);

state.units.push(merc);
spawnVisualEffect(state, 'heal', spawnX, spawnY, '#06b6d4');
spawnFloatingText(state, `Mercenary Recruited!`, spawnX, spawnY - 30, '#06b6d4');
}
break;
}

case 'upgrade_tower': {
const towerId = action.towerId;
const tower = state.towers.find(t => t.id === towerId && t.team === team);
if (tower) {
const upgradeCost = tower.level * 140;
if (p.gold >= upgradeCost) {
p.gold -= upgradeCost;
tower.level++;

let hpIncrease = 500;
let atkIncrease = 12;

const pRace = p.race;
if (pRace === 'dwarf' || pRace === 'troll') hpIncrease = Math.floor(hpIncrease * 1.1);
if (pRace === 'naga') hpIncrease = Math.floor(hpIncrease * 0.9);
if (pRace === 'tauren' || pRace === 'orc') atkIncrease = Math.floor(atkIncrease * 1.2);

tower.maxHp += hpIncrease;
tower.hp = tower.maxHp; // Heal back to full upon upgrade
tower.atk += atkIncrease;
tower.maxAtkCooldown = Math.max(22, tower.maxAtkCooldown - 4); // fire speed boost

spawnVisualEffect(state, 'heal', tower.x, tower.y, '#eab308');
spawnFloatingText(state, `Tower Level ${tower.level}`, tower.x, tower.y - 30, '#eab308');
}
}
break;
}

case 'summon_hero': {
if (state.settings && !state.settings.heroesEnabled) {
spawnFloatingText(state, `Heroes Disabled!`, castleC.x, castleC.y - 45, '#ef4444');
return;
}
if (p.heroSummoned) return;
const cost = 350; // Align with UI and AI checks
if (p.gold >= cost) {
p.gold -= cost;
p.heroSummoned = true;

// Spawn champion in the middle lane
const cords = CASTLE_COORDS[team];
const hUnit = createUnit(team, 'middle', 'hero', cords.x, cords.y, state.settings?.factionBonusMultiplier || 1.0, p.research, p.race, state.gameMode);
state.units.push(hUnit);

spawnVisualEffect(state, 'explosion', cords.x, cords.y, '#f59e0b');
spawnFloatingText(state, `${hUnit.name} Embarks!`, cords.x, cords.y - 45, '#f59e0b');
}
break;
}

case 'cast_spell': {
if (state.settings && !state.settings.spellsEnabled) {
spawnFloatingText(state, `Spells Disabled!`, castleC.x, castleC.y - 45, '#ef4444');
return;
}
const lane = action.lane;
const spellType = action.spellType;

let spellCost = spellType === 'ultimate' ? 50 : 15;
if (p.race === 'blood_elf') {
spellCost = Math.floor(spellCost * 0.8);
}

if (p.mana >= spellCost) {
p.mana -= spellCost;

// Perform extreme ultimate magic
if (spellType === 'meteor') {
// Fire cosmic shower in the lane center targeting enemy units
state.units.forEach(u => {
if (u.team !== team && isLaneCompatible(team, lane, u.team, u.lane)) {
u.hp -= 170;
spawnFloatingText(state, `-170 Spell Burn`, u.x, u.y, '#ef4444');
spawnVisualEffect(state, 'explosion', u.x, u.y, '#f97316');
}
});
// Visual epic meteor crash marker
const targetCoords = CASTLE_COORDS[TEAM_TARGETS[team][lane]];
const midX = (castleC.x + targetCoords.x) / 2;
const midY = (castleC.y + targetCoords.y) / 2;

spawnVisualEffect(state, 'meteor', midX, midY, '#ef4444');
spawnFloatingText(state, `HELLFIRE METEOR CAST`, midX, midY, '#f97316');
} 

else if (spellType === 'storm') {
// Frozen blizzard chain bolts
state.units.forEach(u => {
if (u.team !== team && isLaneCompatible(team, lane, u.team, u.lane)) {
u.hp -= 120;
u.speed *= 0.65; // freeze slow!
spawnFloatingText(state, `-120 Blizz Frozen`, u.x, u.y, '#60a5fa');
spawnVisualEffect(state, 'lightning', castleC.x, castleC.y, '#3b82f6', u.x, u.y);
}
});
spawnFloatingText(state, `BLIZZARD STORM OUTBREAK`, castleC.x, castleC.y - 60, '#60a5fa');
}

else if (spellType === 'bloodlust') {
// Temporary rage speed buff for all allied units on that lane
state.units.forEach(u => {
if (u.lane === lane && u.team === team) {
u.speed *= 1.4;
spawnFloatingText(state, `BLOODLUST!`, u.x, u.y, '#10b981');
spawnVisualEffect(state, 'bloodlust', u.x, u.y, '#10b981');
}
});
}

else if (spellType === 'scourge_raise') {
// Scourge necromancy: Spawns skeleton armies in that lane
if (state.settings && !state.settings.specialUnitsEnabled) {
spawnFloatingText(state, `Special Units Disabled`, castleC.x, castleC.y - 45, '#ef4444');
return;
}
const coords = CASTLE_COORDS[team];
for (let i = 0; i < 3; i++) {
const skel = createUnit(team, lane, 'skeleton', coords.x + (i * 20), coords.y, state.settings?.factionBonusMultiplier || 1.0, p.research, p.race, state.gameMode);
state.units.push(skel);
}
spawnVisualEffect(state, 'scourge_dead', coords.x, coords.y, '#a855f7');
spawnFloatingText(state, `ARMIES OF SKELETONS RAISED`, coords.x, coords.y - 40, '#a855f7');
}

else if (spellType === 'ultimate') {
if (!p.ultimateResearched || p.mana < 50) return;
p.mana -= 50;

// 1. Global Meteor strike dealing 350 damage to all active enemy units
state.units.forEach(u => {
if (u.team !== team && u.state !== 'dead') {
u.hp -= 350;
spawnFloatingText(state, `-350 DOOM`, u.x, u.y, '#ef4444');
spawnVisualEffect(state, 'explosion', u.x, u.y, '#f97316');
}
});

// 2. Spawn Elite Doom wave in all 3 lanes (spawns 1 giant Siege unit and 2 elite mages)
const lanesList: LaneType[] = ['top', 'middle', 'bottom'];
lanesList.forEach(lane => {
const coords = CASTLE_COORDS[team];
const siegeElite = createUnit(team, lane, 'siege', coords.x, coords.y, 1.8, p.research, p.race, state.gameMode);
siegeElite.name = `ELITE DOOM TANK`;
state.units.push(siegeElite);

for (let i = 0; i < 2; i++) {
const mageElite = createUnit(team, lane, 'mage', coords.x + (i * 20), coords.y, 1.5, p.research, p.race, state.gameMode);
mageElite.name = `ELITE WARCASTER`;
state.units.push(mageElite);
}
});

spawnVisualEffect(state, 'meteor', MAP_WIDTH / 2, MAP_HEIGHT / 2, '#ef4444');
spawnFloatingText(state, `ULTIMATE DOOM LAUNCHED!`, MAP_WIDTH / 2, MAP_HEIGHT / 2, '#ef4444');
}
}
}
break;

case 'research_ultimate':
if (p.ultimateResearched) return;
if (p.gold >= 600) {
p.gold -= 600;
p.ultimateResearched = true;
spawnVisualEffect(state, 'explosion', castleC.x, castleC.y, '#eab308');
spawnFloatingText(state, `ULTIMATE WEAPON RESEARCHED!`, castleC.x, castleC.y - 50, '#eab308');
}
break;

case 'research_upgrade': {
const upType = action.upgradeType;
const currentLvl = p.research[upType] || 0;
const pRace = p.race;
const maxLvl = getUpgradeLevelCap(upType, pRace, state.gameMode);
if (currentLvl >= maxLvl) return;

let cost = upType === 'masonry' ? 150 + currentLvl * 75 : 100 + currentLvl * 60;
if (state.gameMode !== 'minimal') {
if (pRace === 'demon') cost = Math.floor(cost * 1.1);
else if (pRace === 'undead') cost = Math.floor(cost * 0.95);
else if (pRace === 'fel_orc') cost = Math.floor(cost * 0.9);
else if (pRace === 'night_elf') cost = Math.floor(cost * 1.2);
}

if (p.gold >= cost) {
p.gold -= cost;
p.research[upType]++;

// If masonry was upgraded, boost max HP of all player's structures and heal them!
if (upType === 'masonry') {
state.towers.forEach(tow => {
if (tow.team === team) {
tow.maxHp += 300;
tow.hp += 300;
}
});
}

spawnVisualEffect(state, 'heal', castleC.x, castleC.y, '#eab308');
spawnFloatingText(state, `${upType.toUpperCase()} LVL ${currentLvl + 1}`, castleC.x, castleC.y - 50, '#eab308');
}
break;
}
}
}

// Bot Strategy Loop for any CPU vacant slots (Robust FFA play)
function runFFA_BotAI(state: GameState) {
// Cycle all 4 players and execute AI on any player that has CPU names
const teams: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

teams.forEach(t => {
const p = state.players[t];
if (!p) return;

const isCpu = p.name.includes('CPU') || p.name.includes('Bot') || p.name === 'Vacant Player Slot' || p.name === 'Offline Player';
if (!isCpu) return;

// AI decisions triggered randomly at a relaxed rate (~1% chance per tick) to fit macro pace
if (Math.random() < 0.01) {
// 1. Level up Gold Passive salary
if (p.gold >= p.incomeUpgradeCost && Math.random() < 0.5) {
applyAction(state, t, { type: 'upgrade_income' });
return;
}

const lanes: LaneType[] = ['top', 'middle', 'bottom'];
const chosenLane = lanes[Math.floor(Math.random() * lanes.length)];

// 2. Build heavy barracks
const currentBarLevel = p.barracksLevel[chosenLane];
const upgradeC = currentBarLevel === 1 ? 160 : 320;
if (currentBarLevel > 0 && p.gold >= upgradeC && currentBarLevel < 3 && Math.random() < 0.35) {
applyAction(state, t, { type: 'upgrade_barracks', lane: chosenLane });
return;
}

// 3. Summon champion Hero if ready
if (!p.heroSummoned && p.gold >= 350 && Math.random() < 0.6) {
applyAction(state, t, { type: 'summon_hero' });
return;
}

// 4. Casting extreme magic spells
if (p.mana >= 15 && Math.random() < 0.45) {
const spells: ('meteor' | 'storm' | 'bloodlust' | 'scourge_raise')[] = ['meteor', 'storm', 'bloodlust', 'scourge_raise'];
const chosenSpell = spells[Math.floor(Math.random() * spells.length)];
applyAction(state, t, { type: 'cast_spell', lane: chosenLane, spellType: chosenSpell });
return;
}

// 5. Emergency towers reinforcement under low-hp
const myDamagedTowers = state.towers.filter(tower => tower.team === t && tower.hp < tower.maxHp * 0.7);
if (myDamagedTowers.length > 0 && p.gold >= myDamagedTowers[0].level * 140) {
applyAction(state, t, { type: 'upgrade_tower', towerId: myDamagedTowers[0].id });
return;
}

// 6. Recruit quick mercenaries to counter pressure
if (p.gold >= 100) {
const uTypes: UnitType[] = ['melee', 'ranged', 'mage', 'siege'];
const chosenType = uTypes[Math.floor(Math.random() * uTypes.length)];
applyAction(state, t, { type: 'hire_mercenary', lane: chosenLane, unitType: chosenType });
}

// 7. Research upgrades if bots have extra gold
if (p.gold >= 120 && Math.random() < 0.35) {
const upgradeTypes: ('meleeAtk' | 'rangedAtk' | 'magicAtk' | 'defense' | 'masonry')[] = ['meleeAtk', 'rangedAtk', 'magicAtk', 'defense', 'masonry'];
const chosenUp = upgradeTypes[Math.floor(Math.random() * upgradeTypes.length)];
const currentLvl = p.research?.[chosenUp] || 0;
const maxLvl = getUpgradeLevelCap(chosenUp, p.race, state.gameMode);
const upCost = chosenUp === 'masonry' ? 150 + currentLvl * 75 : 100 + currentLvl * 60;
if (p.gold >= upCost && currentLvl < maxLvl) {
applyAction(state, t, { type: 'research_upgrade', upgradeType: chosenUp });
}
}
}
});
}

// Spawns automatic Tug of War batch waves
function handleWaveSpawns(state: GameState, dt: number = 1.0) {
state.waveTimer -= dt;

if (state.waveTimer <= 0) {
state.waveTimer = state.maxWaveTimer;

const teams: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
const lanes: LaneType[] = ['top', 'middle', 'bottom'];

// Russian Roulette mode logic:
if (state.gameMode === 'russian_roulette') {
const activeTeams = [1, 2, 3, 4].filter(t => {
const castle = state.towers.find(tow => tow.id === `castle-${t}`);
return castle && castle.hp > 0 && state.players[t as 1 | 2 | 3 | 4] !== null;
}) as (1 | 2 | 3 | 4)[];

if (activeTeams.length > 0) {
const victimTeam = activeTeams[Math.floor(Math.random() * activeTeams.length)];
const castle = state.towers.find(tow => tow.id === `castle-${victimTeam}`)!;
const p = state.players[victimTeam]!;

// 1 in 6 chance of bullet (damage)
const isBullet = Math.random() < 1/6;
if (isBullet) {
castle.hp = Math.max(1, castle.hp - 500); // deal 500 damage (minimum 1 HP)
spawnVisualEffect(state, 'explosion', castle.x, castle.y, '#ef4444');
spawnFloatingText(state, 'BANG! -500 HP', castle.x, castle.y - 50, '#ef4444');
} else {
// Safe, give 100 gold
p.gold += 100;
spawnVisualEffect(state, 'heal', castle.x, castle.y, '#22c55e');
spawnFloatingText(state, '*Click* Safe (+100g)', castle.x, castle.y - 50, '#22c55e');
}
}
}

teams.forEach(t => {
const p = state.players[t];
if (!p) return;

const castle = CASTLE_COORDS[t];

lanes.forEach(lane => {
const barracksLvl = p.barracksLevel[lane];
if (barracksLvl === 0) return; // Disabled barracks spawns nothing!

let composition: UnitType[] = [];
if (barracksLvl === 1) composition = ['melee', 'melee', 'ranged'];
else if (barracksLvl === 2) composition = ['melee', 'melee', 'ranged', 'ranged', 'mage', 'mounted'];
else composition = ['melee', 'melee', 'melee', 'ranged', 'ranged', 'mage', 'mage', 'siege', 'mounted', 'air'];

composition.forEach((unitType, idx) => {
// Spawn slightly offset from the central Castle towards the designated target coordinate
const targetCoords = CASTLE_COORDS[TEAM_TARGETS[t][lane]];
const dx = targetCoords.x - castle.x;
const dy = targetCoords.y - castle.y;
const dist = Math.sqrt(dx * dx + dy * dy);

// Push them slightly along the path to avoid huge visual stack on top of base
const ratio = (30 + idx * 25) / dist;
const spawnX = castle.x + dx * ratio;
const spawnY = castle.y + dy * ratio;

state.units.push(createUnit(t, lane, unitType, spawnX, spawnY, state.settings?.factionBonusMultiplier || 1.0, p.research, p.race, state.gameMode));
});
});
});

// Splendid cosmic release flash effects
teams.forEach(t => {
const castle = CASTLE_COORDS[t];
spawnVisualEffect(state, 'heal', castle.x, castle.y, FACTION_INFO[t].color);
});

spawnFloatingText(state, "BATTLE WAVES RELEASED UNTO LANES!", MAP_WIDTH / 2, 45, '#f59e0b');
}
}

// Primary authoritative state ticking step
export function gameLoopStep(state: GameState, dt: number = 1.0): GameState {
if (state.status !== 'playing') {
return state;
}

// A. Timer increment & passive capital salary release
state.gameTime += dt / 60; // scale gameTime by dt / 60

const secondsPassed = Math.floor(state.gameTime) - Math.floor(state.gameTime - dt / 60);
if (secondsPassed > 0) {
const teamsList: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
teamsList.forEach(t => {
const p = state.players[t];
if (p) {
const masonryBonus = (p.research?.masonry || 0) * 3;

// Check captured neutral buildings for passive resource bonuses
let extraGoldPerSec = 0;
let extraManaPerSec = 0;
let extraIncomeRate = 0;
let fountainManaRate = 0;

if (state.neutralBuildings) {
state.neutralBuildings.forEach(nb => {
if (nb.ownerTeam === t) {
if (nb.type === 'gold_mine') {
extraGoldPerSec += 12;
} else if (nb.type === 'gem_mine') {
extraManaPerSec += 2;
} else if (nb.type === 'fountain_of_mana') {
fountainManaRate += 0.2;
} else if (nb.type === 'metal_mine') {
extraIncomeRate += 10;
}
}
});
}

p.gold += (p.income + masonryBonus + extraIncomeRate) * secondsPassed + (extraGoldPerSec * secondsPassed);

let manaGain = 1 + fountainManaRate;
if (state.gameMode !== 'minimal' && (p.race === 'blood_elf' || p.race === 'undead')) {
manaGain *= 1.125;
}
manaGain += extraManaPerSec;
p.mana = Math.min(100, p.mana + manaGain * secondsPassed); // increment spell tech point up to 100 max
}
});
}

// B. Automated waves control
handleWaveSpawns(state, dt);

// C. Artificial Brain commands
if (state.isAiEnabled) {
runFFA_BotAI(state);
}

// D. Tick effects and dynamic text trackers decay
state.effects = state.effects.map(fx => ({ ...fx, timer: fx.timer - dt })).filter(fx => fx.timer > 0);
state.floatingTexts = state.floatingTexts.map(txt => ({ ...txt, timer: txt.timer - dt, y: txt.y - 0.5 * dt })).filter(txt => txt.timer > 0);

// E. Projectile physics movement
state.projectiles.forEach(p => {
let tx = p.targetX;
let ty = p.targetY;

if (p.targetUnitId) {
const unit = state.units.find(u => u.id === p.targetUnitId && u.state !== 'dead');
if (unit) {
tx = unit.x;
ty = unit.y;
}
}

const dx = tx - p.currentX;
const dy = ty - p.currentY;
const dist = Math.sqrt(dx * dx + dy * dy);
const movement = p.speed * dt;

if (dist <= movement) {
// Impact!
if (p.targetUnitId) {
const u = state.units.find(un => un.id === p.targetUnitId);
if (u && u.state !== 'dead') {
const targetPlayer = state.players[u.team];
if (state.gameMode !== 'minimal' && targetPlayer && (targetPlayer.race === 'blood_elf' || targetPlayer.race === 'troll') && Math.random() < 0.04) {
spawnFloatingText(state, `Miss`, u.x, u.y - 10, '#94a3b8');
} else {
u.hp -= p.damage;
spawnFloatingText(state, `-${p.damage}`, u.x, u.y - 10, p.color);
spawnVisualEffect(state, 'slash', u.x, u.y, p.color);
}
}
} else {
// Direct object or Tower damage
const targetTower = state.towers.find(tow => tow.x === tx && tow.y === ty);
if (targetTower) {
targetTower.hp -= p.damage;
spawnFloatingText(state, `-${p.damage}`, targetTower.x, targetTower.y - 20, p.color);
spawnVisualEffect(state, 'explosion', targetTower.x, targetTower.y, p.color);
}
}
p.currentX = tx;
p.currentY = ty;
} else {
p.currentX += (dx / dist) * movement;
p.currentY += (dy / dist) * movement;
}
});

state.projectiles = state.projectiles.filter(p => !((p.currentX === p.targetX && p.currentY === p.targetY) || (p.targetUnitId && !state.units.some(u => u.id === p.targetUnitId && u.state !== 'dead'))));

// F. Active Combat Unit State Machine
// Spatial Grouping by lane (broad-phase O(N) instead of O(N^2))
const unitsByLane: Record<LaneType, Unit[]> = {
top: [],
middle: [],
bottom: []
};
state.units.forEach(u => {
if (u.state !== 'dead' && u.hp > 0) {
unitsByLane[u.lane].push(u);
}
});

// Apply passive regeneration (disabled in minimal mode)
if (state.gameMode !== 'minimal') {
state.units.forEach(u => {
if (u.state !== 'dead') {
const player = state.players[u.team];
if (player && player.race === 'night_elf') {
u.hp = Math.min(u.maxHp, u.hp + 1.5 * (dt / 60));
}
}
});

state.towers.forEach(tow => {
if (tow.hp > 0) {
const player = state.players[tow.team];
let regen = 0;
if (player && (player.race === 'night_elf' || player.race === 'demon')) {
regen += 1.0;
}
if (hasCapturedNode(state, tow.team, 'lumber_mill')) {
regen += 3.0;
}
if (regen > 0) {
tow.hp = Math.min(tow.maxHp, tow.hp + regen * (dt / 60));
}
}
});
}

state.units.forEach(u => {
if (u.state === 'dead') return;

// HP evaluation
if (u.hp <= 0) {
u.state = 'dead';

// Scourge souls reaper bonus (kills reward tech points)
const opp = state.players[u.team];
if (opp && opp.faction === 'scourge') {
opp.gold += 5; // scavenger gold bonus
}

// Potential Skeleton resurrection for Necromantic Scourge
if (u.team === 3 && Math.random() < 0.22 && u.type !== 'skeleton') {
const skel = createUnit(3, u.lane, 'skeleton', u.x, u.y, 1.0, state.players[3]?.research, state.players[3]?.race, state.gameMode);
state.units.push(skel);
spawnVisualEffect(state, 'scourge_dead', u.x, u.y, '#a855f7');
spawnFloatingText(state, `Risen Skeleton!`, u.x, u.y - 10, '#a855f7');
}

// Standard gold bounty
let bounty = 16;
if (u.isHero) bounty = 140;
else if (u.type === 'siege') bounty = 40;
else if (u.type === 'mage') bounty = 24;
else if (u.type === 'mounted') bounty = 32;
else if (u.type === 'air') bounty = 36;
else if (u.type === 'skeleton') bounty = 5;

// Distribute gold evenly to players that are still in game and not allied
const teamsList: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
teamsList.forEach(t => {
if (t !== u.team && state.players[t]) {
state.players[t]!.gold += Math.floor(bounty / 2); // Split raw feed bounty
}
});

spawnFloatingText(state, `+${Math.floor(bounty / 2)} Opponent Gold`, u.x, u.y, '#f59e0b');
spawnVisualEffect(state, 'scourge_dead', u.x, u.y, 'rgba(244,63,94,0.35)');
return;
}

if (u.atkCooldown > 0) {
let decay = dt;
if (hasCapturedNode(state, u.team, 'tavern')) {
decay *= 1.15;
}
u.atkCooldown = Math.max(0, u.atkCooldown - decay);
}

// Overlap prevention force (Repelling units of same team inside same lane only)
const laneUnits = unitsByLane[u.lane];
laneUnits.forEach(other => {
if (other.id !== u.id && other.state !== 'dead' && other.team === u.team) {
// Skip ground-repulsion collision for flying units
if (u.type === 'air' || other.type === 'air') return;

const dx = other.x - u.x;
const dy = other.y - u.y;
const dist = Math.sqrt(dx * dx + dy * dy);
const minDist = u.size + other.size - 2;
if (dist < minDist && dist > 0.05) {
const pushAmount = (minDist - dist) * 0.16;
u.x -= (dx / dist) * pushAmount * 0.15 * dt;
u.y -= (dy / dist) * pushAmount * 0.85 * dt; // vertical dispersion is smoother
}
}
});

// Detect target (Combat narrow phase within the same lane)
let target: Unit | Tower | null = null;
let bestScore = 999999;

// Engage opposing enemies inside the same lane horizontally (or geometrically compatible lane)
const enemiesInLane = state.units.filter(enemy => 
enemy.team !== u.team && 
enemy.state !== 'dead' && 
isLaneCompatible(u.team, u.lane, enemy.team, enemy.lane)
);
enemiesInLane.forEach(enemy => {
const dx = enemy.x - u.x;
const dy = enemy.y - u.y;
const dist = Math.sqrt(dx * dx + dy * dy);

// Proximity threshold
if (dist < 180) {
const score = dist;
if (score < bestScore) {
bestScore = score;
target = enemy;
}
}
});

// Encroach on opposing towers and castles
if (!target) {
state.towers.forEach(tow => {
if (tow.team !== u.team && tow.hp > 0) {
const dx = tow.x - u.x;
const dy = tow.y - u.y;
const dist = Math.sqrt(dx * dx + dy * dy);

const towersMatchLane = tow.lane === 'castle' || isLaneCompatible(u.team, u.lane, tow.team, tow.lane);
const maxTargetDist = towersMatchLane ? 280 : 150;

if (dist < maxTargetDist) {
const score = dist * (towersMatchLane ? 1.0 : 3.0);
if (score < bestScore) {
bestScore = score;
target = tow;
}
}
}
});
}

if (target) {
// Lock target and advance to weapon trigger range
u.targetId = (target as any).id;
const dx = (target as any).x - u.x;
const dy = (target as any).y - u.y;
const targetDist = Math.max(0.1, Math.sqrt(dx * dx + dy * dy) - (target as any).size);

if (targetDist <= u.range) {
// Attack
u.state = 'attacking';
if (u.atkCooldown === 0) {
u.atkCooldown = u.maxAtkCooldown;

const isTargetTower = !((target as any).type);
const baseMultiplier = (u.type === 'siege' && isTargetTower) ? 2.5 : 1.0; 
let damage = Math.floor(u.atk * baseMultiplier);

if (hasCapturedNode(state, u.team, 'war_mill')) {
damage = Math.floor(damage * 1.12);
}
if (hasCapturedNode(state, u.team, 'marketplace') && u.isHero) {
damage = Math.floor(damage * 1.25);
}
const targetTeam = (target as any).team;
if (hasCapturedNode(state, targetTeam, 'sacrificial_altar')) {
damage = Math.floor(damage * 0.90);
}

// Apply target defense/masonry armor reduction with custom race modifiers
const targetPlayer = state.players[targetTeam];
if (targetPlayer) {
const targetRace = targetPlayer.race;
let raceArmor = 0;
if (!isTargetTower) {
if (targetRace === 'dwarf' || targetRace === 'naga') raceArmor += 2;
if (targetRace === 'fel_orc' || targetRace === 'undead') raceArmor -= 2;

if (hasCapturedNode(state, targetTeam, 'forge')) {
raceArmor += 2;
}
if (hasCapturedNode(state, u.team, 'goblin_laboratory')) {
raceArmor -= 2;
}
if ((target as any).isHero && hasCapturedNode(state, targetTeam, 'marketplace')) {
raceArmor += 5;
}
} else {
if (targetRace === 'human' || targetRace === 'naga') raceArmor += 1;

if (hasCapturedNode(state, targetTeam, 'stone_quarry')) {
raceArmor += 4;
}
}

if (isTargetTower) {
const masonryLvl = targetPlayer.research?.masonry || 0;
damage = Math.max(1, damage - raceArmor - masonryLvl * 3.5);
} else {
const defenseLvl = targetPlayer.research?.defense || 0;
damage = Math.max(1, damage - raceArmor - defenseLvl * 2.0);
}
}

if (u.type === 'ranged' || u.type === 'mage') {
const spellColor = u.type === 'mage' ? '#c084fc' : '#fb7185';
state.projectiles.push({
id: `p-${Math.random()}`,
startX: u.x,
startY: u.y,
currentX: u.x,
currentY: u.y,
targetX: (target as any).x,
targetY: (target as any).y,
targetUnitId: isTargetTower ? null : (target as any).id,
speed: 7.2,
damage: damage,
team: u.team,
color: spellColor
});

// Spells chain bolts for Wizard mage class
if (u.type === 'mage' && Math.random() < 0.28) {
spawnVisualEffect(state, 'lightning', u.x, u.y, '#c084fc', (target as any).x, (target as any).y);
}
} else {
// Melee strike with evasion check
const targetPlayer = state.players[targetTeam];
const isTargetTower = !((target as any).type);
const targetRace = targetPlayer?.race;

if (targetPlayer && !isTargetTower && (targetRace === 'blood_elf' || targetRace === 'troll') && Math.random() < 0.04) {
spawnFloatingText(state, `Miss`, (target as any).x, (target as any).y - 8, '#94a3b8');
} else {
(target as any).hp -= damage;
spawnFloatingText(state, `-${damage}`, (target as any).x, (target as any).y - 8, FACTION_INFO[u.team].color);
spawnVisualEffect(state, 'slash', (target as any).x, (target as any).y, FACTION_INFO[u.team].color);

// Special legendary hero shockwave cleaves
if (u.isHero && Math.random() < 0.3) {
spawnVisualEffect(state, 'explosion', u.x, u.y, 'rgba(234,179,8,0.45)');
state.units.forEach(n => {
if (n.team !== u.team && n.state !== 'dead') {
const dNear = Math.sqrt((n.x - u.x) ** 2 + (n.y - u.y) ** 2);
if (dNear < 80) {
n.hp -= Math.floor(damage * 0.6);
spawnFloatingText(state, `-${Math.floor(damage * 0.6)} Splash`, n.x, n.y, '#f59e0b');
}
}
});
}
}
}
}
} else {
// Move towards target
u.state = 'moving';
const dirX = dx / (targetDist + (target as any).size);
const dirY = dy / (targetDist + (target as any).size);
u.x += dirX * u.speed * dt;
u.y += dirY * u.speed * 0.55 * dt; // vertical speed is softened to avoid zigzag jumps
}
} else {
// Advance to destination target Castle
u.targetId = null;
u.state = 'moving';

const targetCastle = CASTLE_COORDS[u.targetTeam];
const dx = targetCastle.x - u.x;
const dy = targetCastle.y - u.y;
const dist = Math.sqrt(dx * dx + dy * dy);
const movement = u.speed * dt;

if (dist > movement) {
u.x += (dx / dist) * movement;
u.y += (dy / dist) * movement;
} else {
u.x = targetCastle.x;
u.y = targetCastle.y;
}
}
});

state.units = state.units.filter(u => u.state !== 'dead');

// G. Tower & Castle Auto Defense Ticks
state.towers.forEach(tow => {
if (tow.hp <= 0) return;

if (tow.atkCooldown > 0) {
tow.atkCooldown = Math.max(0, tow.atkCooldown - dt);
}

// Scan for immediate target within defense range
let bestDist = 99999;
let target: Unit | null = null;

state.units.forEach(u => {
if (u.team !== tow.team && u.state !== 'dead') {
const dx = u.x - tow.x;
const dy = u.y - tow.y;
const dist = Math.sqrt(dx * dx + dy * dy);

if (dist <= tow.range && dist < bestDist) {
bestDist = dist;
target = u;
}
}
});

if (target) {
tow.targetId = (target as Unit).id;
if (tow.atkCooldown === 0) {
tow.atkCooldown = tow.maxAtkCooldown;

let towerDamage = tow.atk;
if (hasCapturedNode(state, tow.team, 'workshop')) {
towerDamage = Math.round(towerDamage * 1.20);
}

state.projectiles.push({
id: `t-proj-${Math.random()}`,
startX: tow.x,
startY: tow.y - 15,
currentX: tow.x,
currentY: tow.y - 15,
targetX: (target as Unit).x,
targetY: (target as Unit).y,
targetUnitId: (target as Unit).id,
speed: 7.0,
damage: towerDamage,
team: tow.team,
color: '#facc15' // gold turret bolts
});

spawnVisualEffect(state, 'slash', tow.x, tow.y - 15, '#eab308');
}
} else {
tow.targetId = null;
}
});

// Check Castle Life to declare winner
const activeCastles = state.towers.filter(t => t.lane === 'castle');
const livingCastlesCount = activeCastles.filter(c => c.hp > 0).length;

if (livingCastlesCount <= 1) {
state.status = 'ended';
const survivorCastle = activeCastles.find(c => c.hp > 0);
state.winnerTeam = survivorCastle ? survivorCastle.team : null;
}

// Clear broken defender towers and reward opposing teams
state.towers = state.towers.filter(t => {
if (t.hp <= 0) {
// Destructor bounty
const bounty = t.lane === 'castle' ? 0 : 250;
if (bounty > 0) {
const teamsList: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
teamsList.forEach(tm => {
if (tm !== t.team && state.players[tm]) {
state.players[tm]!.gold += 120; // share split gold to non-owners
}
});
spawnFloatingText(state, `+120g Faction Bounty (Tower Destroyed!)`, t.x, t.y - 35, '#eab308');
spawnVisualEffect(state, 'explosion', t.x, t.y, '#ef4444');
}
return false;
}
return true;
});

// H. Capture & Tick Neutral Buildings
if (state.neutralBuildings) {
state.neutralBuildings.forEach(nb => {
const nearbyUnits = state.units.filter(u => u.state !== 'dead' && Math.sqrt((u.x - nb.x) ** 2 + (u.y - nb.y) ** 2) <= 100);
const activeTeamsNear = Array.from(new Set(nearbyUnits.map(u => u.team)));

if (activeTeamsNear.length === 1) {
const capturingTeam = activeTeamsNear[0];
const hasHeroOrSiege = nearbyUnits.some(u => u.team === capturingTeam && (u.isHero || u.type === 'siege'));

if (hasHeroOrSiege) {
if (nb.ownerTeam !== capturingTeam) {
nb.captureProgress[capturingTeam] += dt;
if (Math.random() < 0.02 * dt) {
spawnFloatingText(state, `Capturing...`, nb.x, nb.y - 20, FACTION_INFO[capturingTeam].color);
}
if (nb.captureProgress[capturingTeam] >= 120) {
nb.ownerTeam = capturingTeam;
const teamsList: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
teamsList.forEach(t => {
nb.captureProgress[t] = 0;
});
const p = state.players[capturingTeam];
if (p) {
p.gold += 150;
}
spawnVisualEffect(state, 'explosion', nb.x, nb.y, FACTION_INFO[capturingTeam].color);
spawnFloatingText(state, `CAPTURED! +150g bounty`, nb.x, nb.y - 45, FACTION_INFO[capturingTeam].color);
}
}
}
} else {
const teamsList: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
teamsList.forEach(t => {
if (nb.captureProgress[t] > 0) {
nb.captureProgress[t] = Math.max(0, nb.captureProgress[t] - dt * 0.5);
}
});
}

// Passive benefits are now ticked directly in the main resource and health regeneration blocks.
});
}

return state;
}
