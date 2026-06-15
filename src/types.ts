// 📝 PATCH NOTES REMINDER: If you add new unit types, building types, or effect types,
// add an entry to the TOP of src/patchNotes.ts describing the change.
export type LaneType = 'top' | 'middle' | 'bottom';

export type UnitType = 'melee' | 'ranged' | 'siege' | 'mage' | 'hero' | 'skeleton' | 'mounted' | 'air';

export interface Unit {
id: string;
type: UnitType;
team: 1 | 2 | 3 | 4; 
targetTeam: 1 | 2 | 3 | 4;
lane: LaneType;
x: number;
y: number;
hp: number;
maxHp: number;
atk: number;
range: number;
speed: number;
targetId: string | null;
state: 'moving' | 'attacking' | 'dead';
atkCooldown: number;
maxAtkCooldown: number; // in ticks
isHero?: boolean;
name: string;
size: number;
}

export interface Tower {
id: string;
lane: LaneType | 'castle'; 
team: 1 | 2 | 3 | 4;
x: number;
y: number;
hp: number;
maxHp: number;
atk: number;
range: number;
level: number;
atkCooldown: number;
maxAtkCooldown: number;
targetId: string | null;
size: number;
}

export type RaceType =
| 'human'
| 'orc'
| 'demon'
| 'night_elf'
| 'dwarf'
| 'troll'
| 'undead'
| 'naga'
| 'mercenary'
| 'tauren'
| 'fel_orc'
| 'blood_elf';

export type GameModeType =
| 'random'
| 'all_pick'
| 'no_neutrals'
| 'fast_start'
| 'russian_roulette'
| 'minimal';

export interface PlayerState {
id: string;
team: 1 | 2 | 3 | 4;
name: string;
faction: 'alliance' | 'legion' | 'scourge' | 'horde';
race: RaceType;
raceLocked: boolean;
gold: number;
mana: number; // Used for spells (mana or tech points)
income: number;
incomeUpgradeCost: number;
barracksLevel: {
top: number;
middle: number;
bottom: number;
};
summonCooldown: {
top: number;
middle: number;
bottom: number;
};
heroSummoned: boolean;
heroCooldown: number;
ultimateResearched: boolean;
research: {
meleeAtk: number;
rangedAtk: number;
magicAtk: number;
defense: number;
masonry: number;
};
}

export interface Projectile {
id: string;
startX: number;
startY: number;
currentX: number;
currentY: number;
targetX: number;
targetY: number;
targetUnitId: string | null;
speed: number;
damage: number;
team: 1 | 2 | 3 | 4;
color: string;
}

export interface VisualEffect {
id: string;
type: 'lightning' | 'heal' | 'meteor' | 'explosion' | 'slash' | 'scourge_dead' | 'bloodlust';
x: number;
y: number;
targetX?: number; 
targetY?: number;
timer: number;
maxTimer: number;
color: string;
}

export interface FloatingText {
id: string;
text: string;
x: number;
y: number;
color: string;
timer: number;
maxTimer: number;
}

export interface GameSettings {
startingGold: number;
startingMana: number;
waveInterval: number; // in ticks. e.g., 900 ticks = 15 seconds
aiDifficulty: 'easy' | 'moderate' | 'brutal';
gameSpeedMultiplier: number;
heroesEnabled: boolean;
spellsEnabled: boolean;
specialUnitsEnabled: boolean;
startingIncome: number;
factionBonusMultiplier: number;
castleVictoryHp: number;
mapStyle: 'desert' | 'cosmic' | 'woods';
}

export interface NeutralBuilding {
id: string;
type:
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
| 'metal_mine';
x: number;
y: number;
ownerTeam: 1 | 2 | 3 | 4 | null;
captureProgress: Record<1 | 2 | 3 | 4, number>;
size: number;
}

export interface GameState {
units: Unit[];
towers: Tower[];
players: {
1: PlayerState | null;
2: PlayerState | null;
3: PlayerState | null;
4: PlayerState | null;
};
projectiles: Projectile[];
effects: VisualEffect[];
floatingTexts: FloatingText[];
waveTimer: number; 
maxWaveTimer: number; 
gameTime: number; 
status: 'lobby' | 'race_selection' | 'playing' | 'ended';
gameMode: GameModeType | null;
winnerTeam: 1 | 2 | 3 | 4 | null;
lobbyId: string;
isAiEnabled: boolean;
settings: GameSettings;
neutralBuildings: NeutralBuilding[];
}

export type PlayerAction =
| { type: 'upgrade_income' }
| { type: 'upgrade_barracks'; lane: LaneType }
| { type: 'hire_mercenary'; lane: LaneType; unitType: UnitType }
| { type: 'upgrade_tower'; towerId: string }
| { type: 'cast_spell'; lane: LaneType; spellType: 'meteor' | 'storm' | 'bloodlust' | 'scourge_raise' | 'ultimate' }
| { type: 'summon_hero' }
| { type: 'research_ultimate' }
| { type: 'research_upgrade'; upgradeType: 'meleeAtk' | 'rangedAtk' | 'magicAtk' | 'defense' | 'masonry' }
| { type: 'select_mode'; mode: GameModeType }
| { type: 'select_race'; race: RaceType }
| { type: 'confirm_race' };

// Network packets
export interface ClientMessage {
type: 'join' | 'action' | 'toggle_ai' | 'restart' | 'update_settings';
lobbyId?: string;
playerName?: string;
team?: 1 | 2 | 3 | 4;
action?: PlayerAction;
settings?: Partial<GameSettings>;
}

export interface ServerMessage {
type: 'init' | 'state_update' | 'error';
team?: 1 | 2 | 3 | 4 | 'spectator';
gameState?: GameState;
message?: string;
}
