import React, { useState } from 'react';
import { GameState, LaneType, UnitType, PlayerAction, RaceType } from '../types';
import { 
Shield, Swords, Wand2, Flame, Crown, Landmark, 
ArrowUpCircle, Sparkles, User, RefreshCw, Bot, HelpCircle 
} from 'lucide-react';
import { FACTION_INFO, RACE_INFO, getUpgradeLevelCap } from '../engine';

interface GameDashboardProps {
gameState: GameState;
activeTeam: 1 | 2 | 3 | 4 | 'spectator';
selectedTowerId: string | null;
onSendAction: (action: PlayerAction) => void;
onSelectTower: (towerId: string | null) => void;
selectedLane: LaneType;
onChangeLane: (lane: LaneType) => void;
}

export const GameDashboard: React.FC<GameDashboardProps> = ({
gameState,
activeTeam,
selectedTowerId,
onSendAction,
onSelectTower,
selectedLane,
onChangeLane
}) => {
// Local hover state for command tooltips
const [hoveredCommand, setHoveredCommand] = useState<{
name: string;
hotkey: string;
goldCost?: number;
manaCost?: number;
desc: string;
stats?: string;
} | null>(null);

// Spectator fallback
if (activeTeam === 'spectator') {
return (
<div className="p-5 bg-slate-900/90 border-4 border-amber-600 rounded-xl text-center shadow-2xl backdrop-blur-md font-w3-medieval">
<p className="text-amber-500 font-extrabold mb-2 text-sm flex items-center justify-center gap-1.5 font-w3-title uppercase">
⚔️ Faction Watch Tower Active ⚔️
</p>
<p className="text-slate-350 text-xs leading-relaxed max-w-xl mx-auto">
You are observing this match from the spectator post. Complete commands and tactical action spells are directed by the dynamic CPU bot controllers or active warlords.
</p>
</div>
);
}

const pState = gameState.players[activeTeam];
if (!pState) {
return (
<div className="p-6 bg-slate-900 border-4 border-slate-700 rounded-xl text-center text-slate-400 text-xs animate-pulse font-w3-medieval">
Establishing Link with Citadel War Room...
</div>
);
}

const faction = pState.faction;
const selectedTower = gameState.towers.find(t => t.id === selectedTowerId);
const selectedTowerIsMine = selectedTower?.team === activeTeam;

// Faction Specific Visual Metadata
const getFactionCrest = () => {
switch (faction) {
case 'alliance': return '🛡️';
case 'horde': return '🪓';
case 'scourge': return '💀';
case 'legion': return '😈';
default: return '⚔️';
}
};

const getCommanderPortrait = (race: RaceType) => {
switch (race) {
case 'human':
return {
name: 'Grand Marshal Garithos',
title: 'Royal Commander',
avatar: '👑',
quote: '"For the glory of the Alliance!"'
};
case 'orc':
return {
name: 'Warlord Grommash',
title: 'Horde Chieftain',
avatar: '🐗',
quote: '"Victory or death! For the Horde!"'
};
case 'demon':
return {
name: 'Pit Lord Azgalor',
title: 'Legion Commander',
avatar: '🔥',
quote: '"Burn this world to ashes!"'
};
case 'night_elf':
return {
name: 'Priestess Tyrande',
title: 'High Priestess',
avatar: '🌙',
quote: '"May Elune grant us strength."'
};
case 'dwarf':
return {
name: 'Thane Muradin',
title: 'Mountain King',
avatar: '🧔',
quote: '"For Khaz Modan!"'
};
case 'troll':
return {
name: "Vol'jin Shadow",
title: 'Shadow Hunter',
avatar: '👹',
quote: '"The spirits be with us."'
};
case 'undead':
return {
name: "Lich Kel'Thuzad",
title: 'Arch-Necromancer',
avatar: '❄️',
quote: '"The cold hand of death awaits."'
};
case 'naga':
return {
name: 'Lady Vashj',
title: 'Sea Witch',
avatar: '🧜‍♀️',
quote: '"For Queen Azshara!"'
};
case 'mercenary':
return {
name: 'Mercenary Warlord',
title: 'Contract Master',
avatar: '🤠',
quote: '"Gold talks, everyone else walks."'
};
case 'tauren':
return {
name: 'Chieftain Cairne',
title: 'Elder Chieftain',
avatar: '🐂',
quote: '"Walk in peace, but carry a big axe."'
};
case 'fel_orc':
return {
name: 'Chaos Lord',
title: 'Bloodcursed Chieftain',
avatar: '👺',
quote: '"Demonic power flows through us!"'
};
case 'blood_elf':
return {
name: "Prince Kael'thas",
title: 'Sun King',
avatar: '🧝',
quote: '"My people will have vengeance!"'
};
default:
return {
name: 'Commander',
title: 'Warlord',
avatar: '⚔️',
quote: '"To battle!"'
};
}
};

const commander = getCommanderPortrait(pState.race);
const selectedTowerLabel = selectedTower
? selectedTower.lane === 'castle'
? `${commander.name} Fortress`
: `Sentry Post (${selectedTower.lane.toUpperCase()})`
: null;

// Command Labels with dynamic configs
const getCommandDetails = (race: RaceType) => {
const rInfo = RACE_INFO[race] || RACE_INFO.human;

// Get cost multiplier
let costMult = 1.0;
if (gameState.gameMode !== 'minimal') {
if (race === 'demon') costMult = 1.3;
else if (race === 'undead' || race === 'mercenary') costMult = 0.7;
}

const meleeCost = Math.floor(45 * costMult);
const rangedCost = Math.floor(60 * costMult);
const mageCost = Math.floor(85 * costMult);
const siegeCost = Math.floor(135 * costMult);
const heroCost = 350;

let meleeIcon = '⚔️';
let rangedIcon = '🏹';
let mageIcon = '🔮';
let siegeIcon = '🚜';
let heroIcon = '👑';

switch (race) {
case 'human':
meleeIcon = '🛡️'; rangedIcon = '🏹'; mageIcon = '🔮'; siegeIcon = '🚜'; heroIcon = '👑';
break;
case 'orc':
meleeIcon = '🪓'; rangedIcon = '🏹'; mageIcon = '⚡'; siegeIcon = '🧱'; heroIcon = '🐗';
break;
case 'demon':
meleeIcon = '👹'; rangedIcon = '🎯'; mageIcon = '☄️'; siegeIcon = '🔥'; heroIcon = '😈';
break;
case 'night_elf':
meleeIcon = '🌙'; rangedIcon = '🏹'; mageIcon = '🍃'; siegeIcon = '🏹'; heroIcon = '🧝‍♀️';
break;
case 'dwarf':
meleeIcon = '🔨'; rangedIcon = '🔫'; mageIcon = '⚡'; siegeIcon = '🤖'; heroIcon = '🧔';
break;
case 'troll':
meleeIcon = '🪓'; rangedIcon = '🎯'; mageIcon = '🧪'; siegeIcon = '🎪'; heroIcon = '👹';
break;
case 'undead':
meleeIcon = '🧟'; rangedIcon = '💀'; mageIcon = '🧙'; siegeIcon = '🥩'; heroIcon = '❄️';
break;
case 'naga':
meleeIcon = '🔱'; rangedIcon = '🏹'; mageIcon = '🌊'; siegeIcon = '🦎'; heroIcon = '🧜‍♀️';
break;
case 'mercenary':
meleeIcon = '🗡️'; rangedIcon = '🎯'; mageIcon = '👤'; siegeIcon = '🤖'; heroIcon = '🤠';
break;
case 'tauren':
meleeIcon = '🐂'; rangedIcon = '🔱'; mageIcon = '👻'; siegeIcon = '🥁'; heroIcon = '🐂';
break;
case 'fel_orc':
meleeIcon = '👹'; rangedIcon = '🎯'; mageIcon = '🔥'; siegeIcon = '💥'; heroIcon = '👺';
break;
case 'blood_elf':
meleeIcon = '⚔️'; rangedIcon = '🏹'; mageIcon = '🔥'; siegeIcon = '☀️'; heroIcon = '🧝';
break;
}

return {
melee: {
name: rInfo.units.melee,
cost: meleeCost,
icon: meleeIcon,
desc: `Durable frontline ${rInfo.units.melee} combatant.`
},
ranged: {
name: rInfo.units.ranged,
cost: rangedCost,
icon: rangedIcon,
desc: `Agile high-range ${rInfo.units.ranged} marksman.`
},
mage: {
name: rInfo.units.mage,
cost: mageCost,
icon: mageIcon,
desc: `Arcane caster ${rInfo.units.mage} that launches spells.`
},
siege: {
name: rInfo.units.siege,
cost: siegeCost,
icon: siegeIcon,
desc: `Heavy structure siege machine ${rInfo.units.siege}. Deals double damage to structures.`
},
hero: {
name: rInfo.heroName,
cost: heroCost,
icon: heroIcon,
desc: `Summons ${rInfo.heroName}, the legendary champion of the ${rInfo.name}.`
}
};
};

const unitConfigs = getCommandDetails(pState.race);

// Upgrade Costs
const topBarracksLvl = pState.barracksLevel.top;
const midBarracksLvl = pState.barracksLevel.middle;
const botBarracksLvl = pState.barracksLevel.bottom;

const getUpgradeCost = (lvl: number) => {
let cost = lvl === 1 ? 160 : 320;
const race = pState.race;
if (gameState.gameMode !== 'minimal') {
if (race === 'demon') cost = Math.floor(cost * 1.3);
else if (race === 'undead' || race === 'mercenary') cost = Math.floor(cost * 0.7);
}
return cost;
};

type CommandCard = {
key: string;
hotkey?: string;
icon: string;
label: string;
desc: string;
stats?: string;
disabled?: boolean;
costText?: string;
onClick?: () => void;
tone?: 'default' | 'gold' | 'purple' | 'emerald' | 'slate';
};

const blankCard = (key: string): CommandCard => ({
key,
icon: '·',
label: '',
desc: 'No command available.',
disabled: true,
tone: 'slate'
});

const buildCommandCards = (): CommandCard[] => {
if (!selectedTower) {
return [
{ key: 'income', hotkey: 'I', icon: '🪙', label: 'Income', desc: 'Increase passive gold income.', stats: `Cost: ${pState.incomeUpgradeCost}g`, disabled: pState.gold < pState.incomeUpgradeCost, costText: `${pState.incomeUpgradeCost}g`, onClick: () => onSendAction({ type: 'upgrade_income' }), tone: 'gold' as const },
{ key: 'hero', hotkey: 'R', icon: '👑', label: 'Hero', desc: 'Summon your faction champion.', stats: pState.heroSummoned ? 'Summoned' : 'Available', disabled: pState.heroSummoned || pState.gold < 350, costText: '350g', onClick: () => onSendAction({ type: 'summon_hero' }), tone: 'purple' as const },
{ key: 'ult-research', hotkey: 'T', icon: '🚀', label: pState.ultimateResearched ? 'Ult Ready' : 'Research', desc: 'Research the faction ultimate.', stats: 'Cost: 600g', disabled: pState.ultimateResearched || pState.gold < 600, costText: '600g', onClick: () => onSendAction({ type: 'research_ultimate' }), tone: 'emerald' as const },
{ key: 'lane-top', hotkey: 'Q', icon: '⬆️', label: 'Top', desc: 'Focus top lane.', onClick: () => onChangeLane('top') },
{ key: 'lane-mid', hotkey: 'W', icon: '➡️', label: 'Mid', desc: 'Focus middle lane.', onClick: () => onChangeLane('middle') },
{ key: 'lane-bot', hotkey: 'E', icon: '⬇️', label: 'Bottom', desc: 'Focus bottom lane.', onClick: () => onChangeLane('bottom') },
{ key: 'meteor', hotkey: 'Z', icon: '☄️', label: 'Meteor', desc: 'Cast Meteor on the active lane.', stats: 'Mana: 15', disabled: pState.mana < 15, costText: '15MP', onClick: () => onSendAction({ type: 'cast_spell', lane: selectedLane, spellType: 'meteor' }), tone: 'gold' as const },
{ key: 'storm', hotkey: 'X', icon: '❄️', label: 'Storm', desc: 'Cast Blizzard Storm on the active lane.', stats: 'Mana: 15', disabled: pState.mana < 15, costText: '15MP', onClick: () => onSendAction({ type: 'cast_spell', lane: selectedLane, spellType: 'storm' }), tone: 'slate' as const },
{ key: 'bloodlust', hotkey: 'C', icon: '🔥', label: 'Rage', desc: 'Buff allied units on the active lane.', stats: 'Mana: 15', disabled: pState.mana < 15, costText: '15MP', onClick: () => onSendAction({ type: 'cast_spell', lane: selectedLane, spellType: 'bloodlust' }), tone: 'emerald' as const },
{ key: 'raise', hotkey: 'V', icon: '💀', label: pState.ultimateResearched ? 'Ultimate' : 'Raise', desc: pState.ultimateResearched ? 'Cast your researched ultimate.' : 'Raise skeleton servants.', stats: pState.ultimateResearched ? 'Mana: 50' : 'Mana: 15', disabled: pState.mana < (pState.ultimateResearched ? 50 : 15), costText: pState.ultimateResearched ? '50MP' : '15MP', onClick: () => onSendAction({ type: 'cast_spell', lane: selectedLane, spellType: pState.ultimateResearched ? 'ultimate' : 'scourge_raise' }), tone: pState.ultimateResearched ? 'gold' as const : 'purple' as const },
blankCard('empty-10'), blankCard('empty-11'), blankCard('empty-12')
];
}

if (selectedTower.lane === 'castle') {
const researchTypes: Array<'meleeAtk' | 'rangedAtk' | 'magicAtk' | 'defense' | 'masonry'> = ['meleeAtk', 'rangedAtk', 'magicAtk', 'defense', 'masonry'];
const researchCards = researchTypes.map((upType, idx) => {
const lvl = pState.research?.[upType] || 0;
const maxLvl = getUpgradeLevelCap(upType, pState.race);
const isMax = lvl >= maxLvl;
let cost = upType === 'masonry' ? 150 + lvl * 75 : 100 + lvl * 60;
if (pState.race === 'demon') cost = Math.floor(cost * 1.1);
else if (pState.race === 'undead') cost = Math.floor(cost * 0.95);
else if (pState.race === 'fel_orc') cost = Math.floor(cost * 0.9);
else if (pState.race === 'night_elf') cost = Math.floor(cost * 1.2);

let label = 'Melee', icon = '⚔️', desc = 'Upgrade melee and cavalry damage.';
if (upType === 'rangedAtk') { label = 'Ranged'; icon = '🏹'; desc = 'Upgrade ranged and air damage.'; }
else if (upType === 'magicAtk') { label = 'Magic'; icon = '🔮'; desc = 'Upgrade spell damage.'; }
else if (upType === 'defense') { label = 'Defense'; icon = '🛡️'; desc = 'Reduce damage taken by units.'; }
else if (upType === 'masonry') { label = 'Masonry'; icon = '🧱'; desc = 'Improve castle and structure durability.'; }

return {
key: `research-${upType}`,
hotkey: String(idx + 1),
icon,
label,
desc,
stats: isMax ? 'MAX RANK' : `Lvl ${lvl}/${maxLvl}`,
disabled: isMax || pState.gold < cost,
costText: `${cost}g`,
onClick: () => onSendAction({ type: 'research_upgrade', upgradeType: upType }),
tone: 'gold' as const
};
});

return [
{ key: 'income', hotkey: 'I', icon: '🪙', label: 'Income', desc: 'Increase passive gold income.', stats: `Cost: ${pState.incomeUpgradeCost}g`, disabled: pState.gold < pState.incomeUpgradeCost, costText: `${pState.incomeUpgradeCost}g`, onClick: () => onSendAction({ type: 'upgrade_income' }), tone: 'gold' as const },
{ key: 'hero', hotkey: 'R', icon: '👑', label: 'Hero', desc: 'Summon your faction champion.', stats: pState.heroSummoned ? 'Summoned' : 'Available', disabled: pState.heroSummoned || pState.gold < 350, costText: '350g', onClick: () => onSendAction({ type: 'summon_hero' }), tone: 'purple' as const },
{ key: 'ult-research', hotkey: 'T', icon: '🚀', label: pState.ultimateResearched ? 'Ult Ready' : 'Research', desc: 'Research the faction ultimate.', stats: 'Cost: 600g', disabled: pState.ultimateResearched || pState.gold < 600, costText: '600g', onClick: () => onSendAction({ type: 'research_ultimate' }), tone: 'emerald' as const },
...researchCards,
blankCard('empty-8'), blankCard('empty-9'), blankCard('empty-10'), blankCard('empty-11'), blankCard('empty-12')
].slice(0, 12);
}

const upgradeCost = selectedTower.level * 140;
return [
{ key: 'tower-upgrade', hotkey: 'U', icon: '🏯', label: 'Promote', desc: `Promote this ${selectedTower.lane} sentry post.`, stats: `Cost: ${upgradeCost}g`, disabled: selectedTowerIsMine ? pState.gold < upgradeCost : true, costText: `${upgradeCost}g`, onClick: () => onSendAction({ type: 'upgrade_tower', towerId: selectedTower.id }), tone: 'gold' as const },
{ key: 'lane-top', hotkey: 'Q', icon: '⬆️', label: 'Top', desc: 'Focus top lane.', onClick: () => onChangeLane('top') },
{ key: 'lane-mid', hotkey: 'W', icon: '➡️', label: 'Mid', desc: 'Focus middle lane.', onClick: () => onChangeLane('middle') },
{ key: 'lane-bot', hotkey: 'E', icon: '⬇️', label: 'Bottom', desc: 'Focus bottom lane.', onClick: () => onChangeLane('bottom') },
blankCard('empty-4'), blankCard('empty-5'), blankCard('empty-6'), blankCard('empty-7'), blankCard('empty-8'), blankCard('empty-9'), blankCard('empty-10'), blankCard('empty-11')
].slice(0, 12);
};

const commandCards = buildCommandCards();

// Set faction theme console class
const consoleSkinClass = `w3-console w3-console-${faction} text-slate-200`;

return (
<div className={consoleSkinClass}>

{/* HUD CONSOLE INNER GRID */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch font-w3-medieval">

{/* LEFT PANEL: FACTION CREST & SYSTEM CONTROLS (col-span-3) */}
<div className="lg:col-span-3 flex flex-col justify-between p-2 bg-slate-950/40 border border-slate-800 rounded-lg">
<div className="space-y-2 text-center lg:text-left">
<div className="flex items-center gap-2 border-b border-slate-800 pb-2 justify-center lg:justify-start">
<span className="text-xl shadow-lg">{getFactionCrest()}</span>
<div>
<h4 className="font-w3-title text-sm font-extrabold uppercase text-amber-500 tracking-wider leading-none">
{FACTION_INFO[pState.team].name}
</h4>
<p className="text-[9px] uppercase font-bold text-slate-400 mt-1">War Room Dashboard</p>
</div>
</div>

{/* Faction dynamic quote */}
<p className="text-[10px] text-slate-400 italic text-center lg:text-left leading-relaxed">
{commander.quote}
</p>

{/* Active Captures */}
{(() => {
const myCaptures = gameState.neutralBuildings?.filter(nb => nb.ownerTeam === activeTeam) || [];
if (myCaptures.length > 0) {
return (
<div className="pt-2 border-t border-slate-905 mt-2 text-left">
<p className="text-[9px] font-black uppercase text-amber-500/80 tracking-widest block mb-1">
Captured Nodes ({myCaptures.length})
</p>
<div className="flex flex-wrap gap-1">
{myCaptures.map(nb => {
let icon = '🏯';
let label = 'Node';
if (nb.type === 'gold_mine') { icon = '🪙'; label = 'Gold Mine'; }
else if (nb.type === 'gem_mine') { icon = '💎'; label = 'Gem Mine'; }
else if (nb.type === 'lumber_mill') { icon = '🪵'; label = 'Lumber Mill'; }
else if (nb.type === 'war_mill') { icon = '🪓'; label = 'War Mill'; }
else if (nb.type === 'forge') { icon = '🛡️'; label = 'Forge'; }
else if (nb.type === 'stone_quarry') { icon = '🧱'; label = 'Quarry'; }
else if (nb.type === 'marketplace') { icon = '⚖️'; label = 'Market'; }
else if (nb.type === 'tavern') { icon = '🍻'; label = 'Tavern'; }
else if (nb.type === 'goblin_laboratory') { icon = '🧪'; label = 'Goblin Lab'; }
else if (nb.type === 'fountain_of_mana') { icon = '⛲'; label = 'Fountain'; }
else if (nb.type === 'sacrificial_altar') { icon = '🔥'; label = 'Altar'; }
else if (nb.type === 'workshop') { icon = '⚙️'; label = 'Workshop'; }
else if (nb.type === 'metal_mine') { icon = '💰'; label = 'Metal Mine'; }

return (
<span 
key={nb.id} 
className="bg-slate-900/80 border border-slate-800 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-300 flex items-center gap-1"
title={label}
>
<span>{icon}</span>
<span>{label}</span>
</span>
);
})}
</div>
</div>
);
}
return null;
})()}
</div>

{/* System Control actions nested neatly */}
<div className="space-y-2 pt-3 border-t border-slate-900 mt-3">
<p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest text-center lg:text-left">Lobby Controls</p>
<div className="grid grid-cols-2 gap-1.5">
<button
type="button"
onClick={() => onSendAction({ type: 'upgrade_income' })}
disabled={pState.gold < pState.incomeUpgradeCost}
className="py-1 px-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 rounded border border-amber-400/30 text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
title="Upgrades Passive Income Rate (I)"
>
<span>🪙 +{pState.income} Income</span>
</button>

<button
type="button"
onClick={() => onSendAction({ type: 'summon_hero' })}
disabled={pState.heroSummoned || pState.gold < 350}
className="py-1 px-2 bg-gradient-to-r from-purple-700 to-indigo-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded border border-purple-500/20 text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
title="Summon Legendary Faction Hero (R)"
>
<span>👑 Summon Champion</span>
</button>
</div>

<div className="grid grid-cols-2 gap-1.5 mt-1.5">
<button
type="button"
onClick={() => onSendAction({ type: 'research_ultimate' })}
disabled={pState.ultimateResearched || pState.gold < 600}
className={`py-1 px-1.5 text-[9.5px] font-bold transition rounded border flex items-center justify-center gap-0.5 cursor-pointer ${
pState.ultimateResearched 
? 'bg-amber-600/10 border-amber-500/30 text-amber-500 cursor-not-allowed' 
: pState.gold >= 600 
? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400' 
: 'bg-slate-850 border-slate-800 text-slate-500 cursor-not-allowed'
}`}
title="Research Faction Ultimate Weapon (Cost: 600g)"
>
<span>🚀 {pState.ultimateResearched ? 'Researched' : 'Research Ult'}</span>
</button>

<button
type="button"
onClick={() => {
if (gameState.status !== 'ended') {
if (window.confirm("Restart this battle arena?")) {
onSendAction({ type: 'upgrade_income' }); // dummy click fallback
}
}
}}
className="py-1 px-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded border border-slate-700 text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
title="Manual restart match"
>
<RefreshCw className="w-3 h-3 text-slate-400" />
<span>Restart Arena</span>
</button>
</div>
</div>
</div>

{/* CENTER PANEL: PORTRAIT AND INSPECT STATS OR DYNAMIC TOOLTIP (col-span-5) */}
<div className="lg:col-span-5 flex items-stretch gap-3 p-3 bg-slate-950/60 border border-slate-850 rounded-lg">

{/* Portrait frame left-side of center panel */}
<div className="w-20 md:w-24 shrink-0 flex flex-col items-center justify-between">
<div className="w3-portrait-frame w-20 h-20 md:w-24 md:h-24 flex items-center justify-center text-4xl bg-slate-900">
{hoveredCommand ? (
<span className="animate-pulse">{hoveredCommand.goldCost ? '🪙' : '🧪'}</span>
) : selectedTower ? (
<span>🏯</span>
) : (
<span className="select-none">{commander.avatar}</span>
)}
</div>

<span className="text-[9px] uppercase tracking-wider text-slate-400 mt-1 font-bold truncate max-w-full">
{hoveredCommand ? 'COMMAND CARD' : selectedTower ? 'TOWER FOCUS' : commander.title}
</span>
</div>

{/* Detailed inspect / hovered tooltip info stats area */}
<div className="flex-1 flex flex-col justify-between min-w-0 py-0.5 text-xs">
{hoveredCommand ? (
// 1. Hover Command Tooltip (Warcraft style)
<div className="space-y-1 text-slate-200 animate-fade-in">
<div className="flex justify-between items-start border-b border-slate-800 pb-1">
<h5 className="font-bold text-amber-400 text-xs tracking-wide">
{hoveredCommand.name}
</h5>
<span className="w3-hotkey-badge shrink-0" style={{ position: 'relative', top: 0, left: 0 }}>
{hoveredCommand.hotkey}
</span>
</div>

<p className="text-[10px] text-slate-300 leading-tight">
{hoveredCommand.desc}
</p>

<div className="flex flex-wrap gap-2 text-[9px] font-mono pt-1 text-amber-500 font-extrabold uppercase">
{hoveredCommand.goldCost !== undefined && (
<span className="bg-amber-950/30 px-1.5 py-0.5 border border-amber-900/40 rounded">
Gold: {hoveredCommand.goldCost}g
</span>
)}
{hoveredCommand.manaCost !== undefined && (
<span className="bg-indigo-950/30 px-1.5 py-0.5 border border-indigo-900/40 rounded text-sky-450">
Mana: {hoveredCommand.manaCost} MP
</span>
)}
{hoveredCommand.stats && (
<span className="text-slate-400 italic font-sans lowercase">
({hoveredCommand.stats})
</span>
)}
</div>
</div>
) : selectedTower ? (
// 2. Selected Tower Statistics
<div className="space-y-1 animate-fade-in">
<div className="flex justify-between items-center border-b border-slate-800 pb-1">
<h5 className="font-bold text-slate-200 text-xs">
{selectedTower.lane === 'castle' ? `${commander.name} Fortress` : `Sentry Post (${selectedTower.lane.toUpperCase()})`}
</h5>
<span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-slate-400 border border-slate-700">
Lvl {selectedTower.level}
</span>
</div>

<div className="space-y-1 text-[11px]">
{/* Glossy Beveled HP status bar */}
<div className="space-y-0.5">
<div className="flex justify-between items-center text-[9px] font-mono font-bold">
<span className="text-slate-400">Structure Stamina</span>
<span className="text-emerald-400">{selectedTower.hp} / {selectedTower.maxHp}</span>
</div>
<div className="w3-bar-container h-3">
<div 
className={`w3-hp-bar ${
selectedTower.hp < selectedTower.maxHp * 0.35 
? 'w3-hp-bar-critical' 
: selectedTower.hp < selectedTower.maxHp * 0.7 
? 'w3-hp-bar-injured' 
: ''
}`} 
style={{ width: `${(selectedTower.hp / selectedTower.maxHp) * 100}%` }} 
/>
</div>
</div>

<div className="grid grid-cols-2 gap-x-2 pt-1.5 text-[10px] text-slate-300 font-medium">
<p>💥 Damage: <span className="font-mono text-amber-400">{selectedTower.atk}</span></p>
<p>🎯 Range: <span className="font-mono text-cyan-400">{selectedTower.range}px</span></p>
</div>
</div>

{/* Direct Upgrade Tower Promotion */}
{selectedTower.team === activeTeam && selectedTower.lane !== 'castle' && (
<button
type="button"
onClick={() => onSendAction({ type: 'upgrade_tower', towerId: selectedTower.id })}
disabled={pState.gold < selectedTower.level * 140}
className="w-full mt-1.5 py-1 px-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-[10px] uppercase rounded border border-amber-400/40 transition cursor-pointer flex justify-between items-center"
title="Promote Sentry Tower Rank (U)"
>
<span>Promote Tower Rank</span>
<span className="font-mono font-bold text-[9px]">-{selectedTower.level * 140}g</span>
</button>
)}

{/* Castle Upgrades Sub-Grid */}
{selectedTower.team === activeTeam && selectedTower.lane === 'castle' && (
<div className="mt-2 space-y-1">
<span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">Castle Researches (Hotkeys 1-5)</span>
<div className="grid grid-cols-5 gap-1 pt-0.5">
{(['meleeAtk', 'rangedAtk', 'magicAtk', 'defense', 'masonry'] as const).map((upType, idx) => {
const lvl = pState.research?.[upType] || 0;
const maxLvl = getUpgradeLevelCap(upType, pState.race);
const isMax = lvl >= maxLvl;

let cost = upType === 'masonry' ? 150 + lvl * 75 : 100 + lvl * 60;
const pRace = pState.race;
if (pRace === 'demon') cost = Math.floor(cost * 1.1);
else if (pRace === 'undead') cost = Math.floor(cost * 0.95);
else if (pRace === 'fel_orc') cost = Math.floor(cost * 0.9);
else if (pRace === 'night_elf') cost = Math.floor(cost * 1.2);

const isDisabled = isMax || pState.gold < cost;

let name = 'Melee Atk';
let icon = '⚔️';
let desc = 'Increases Melee & Cavalry unit damage (+3/lvl).';
if (upType === 'rangedAtk') { name = 'Ranged Atk'; icon = '🏹'; desc = 'Increases Ranged & Air unit damage (+2/lvl).'; }
else if (upType === 'magicAtk') { name = 'Magic Atk'; icon = '🔮'; desc = 'Increases Mage unit attack damage (+3/lvl).'; }
else if (upType === 'defense') { name = 'Iron Armor'; icon = '🛡️'; desc = 'Reduces physical damage taken by all player units (-2 flat/lvl).'; }
else if (upType === 'masonry') { name = 'Masonry'; icon = '🧱'; desc = 'Increases structures max HP (+300/lvl), armor (-3.5 dmg taken/lvl), and income (+3g/sec/lvl).'; }

return (
<button
key={upType}
type="button"
onClick={() => onSendAction({ type: 'research_upgrade', upgradeType: upType })}
disabled={isDisabled}
onMouseEnter={() => setHoveredCommand({
name: `${name} Upgrade (Lvl ${lvl}/${maxLvl})`,
hotkey: String(idx + 1),
goldCost: cost,
desc: desc,
stats: isMax ? 'Maximum Rank Researched' : `Current: Lvl ${lvl} -> Next: Lvl ${lvl + 1}`
})}
onMouseLeave={() => setHoveredCommand(null)}
className="relative aspect-square bg-slate-900 border border-slate-805 disabled:opacity-40 hover:border-amber-500 rounded flex flex-col items-center justify-center cursor-pointer transition"
>
<span className="text-[8px] absolute top-0.5 left-0.5 font-bold bg-slate-950 px-1 rounded text-slate-400">
{idx + 1}
</span>
<span className="text-xs pt-1.5">{icon}</span>
<span className="text-[7.5px] font-black text-slate-350 block mt-0.5 truncate max-w-full px-0.5">
{lvl === maxLvl ? 'MAX' : `Lvl ${lvl}`}
</span>
</button>
);
})}
</div>
</div>
)}
</div>
) : (
// 3. Faction Overview (Default)
<div className="space-y-1.5 text-slate-350">
<h5 className="font-w3-title text-amber-500 text-xs font-extrabold uppercase tracking-wide">
{commander.name}
</h5>
<p className="text-[10px] text-slate-300 font-semibold leading-none">
{commander.title} & Chieftain
</p>
<p className="text-[9px] leading-tight text-slate-400 pt-1">
Ready to deploy armies and direct tactical magic. Select allied towers to upgrade their defenses, or press the command keys to engage waves.
</p>

{/* Active Lane Focus banner */}
<div className="mt-2 py-1 px-2 bg-indigo-950/20 border border-indigo-500/20 rounded text-[9px] text-center font-bold text-indigo-400 flex items-center justify-between">
<span>🎯 CURRENT ACTIVE LANE FOCUS:</span>
<span className="uppercase text-amber-400 font-extrabold">{selectedLane} LANE</span>
</div>
</div>
)}
</div>
</div>

{/* RIGHT PANEL: 3x4 COMMAND CARD GRID (col-span-4) */}
<div className="lg:col-span-4 flex flex-col gap-2 p-2 bg-slate-950/40 border border-slate-800 rounded-lg">

{/* Target Lane Selector Banner right above the card grid */}
<div className="flex items-center justify-between px-1 border-b border-slate-900 pb-1">
<span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
{selectedTowerLabel ? `Selected: ${selectedTowerLabel}` : 'Target Lane Focus'}
</span>
<div className="flex gap-1">
{(['top', 'middle', 'bottom'] as LaneType[]).map(ln => (
<button
key={ln}
type="button"
onClick={() => onChangeLane(ln)}
className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded border transition-colors cursor-pointer ${
selectedLane === ln 
? 'bg-amber-500/20 border-amber-500 text-amber-450' 
: 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
}`}
>
{ln}
</button>
))}
</div>
</div>

<div className="grid grid-cols-4 gap-2">
{commandCards.map(card => (
<button
key={card.key}
type="button"
onClick={card.onClick}
disabled={card.disabled || !card.onClick}
onMouseEnter={() => setHoveredCommand({
name: card.label || 'Empty Slot',
hotkey: card.hotkey || '',
desc: card.desc,
stats: card.stats
})}
onMouseLeave={() => setHoveredCommand(null)}
className={`w3-cmd-btn ${card.disabled ? 'opacity-50' : ''} ${
card.tone === 'gold' ? 'border-amber-500' :
card.tone === 'purple' ? 'border-purple-500' :
card.tone === 'emerald' ? 'border-emerald-500' : ''
}`}
>
{card.hotkey && <div className="w3-hotkey-badge">{card.hotkey}</div>}
<div className="w-full h-full flex flex-col items-center justify-center text-slate-200 pt-3.5 px-1">
<span className="text-lg">{card.icon}</span>
<span className="text-[8px] font-extrabold mt-0.5 uppercase truncate max-w-full">
{card.label || 'EMPTY'}
</span>
</div>
</button>
))}
</div>

{/* legacy command grid retained for reference but hidden */}
<div className="hidden grid-cols-4 gap-2">

{/* ROW 1: Barracks Upgrades (Q, W, E) and Hero Summon (R) */}
<button
onClick={() => onSendAction({ type: 'upgrade_barracks', lane: 'top' })}
disabled={topBarracksLvl === 0 || topBarracksLvl >= 3 || pState.gold < getUpgradeCost(topBarracksLvl)}
className={`w3-cmd-btn ${topBarracksLvl === 0 ? 'opacity-50' : ''}`}
onMouseEnter={() => setHoveredCommand({
name: 'Upgrade Top Barracks',
hotkey: 'Q',
goldCost: topBarracksLvl === 0 ? undefined : getUpgradeCost(topBarracksLvl),
desc: topBarracksLvl === 0 ? 'This barracks is disabled for this match.' : `Upgrades top lane troop composition to spawn stronger classes. Current level: Lvl ${topBarracksLvl}/3.`,
stats: topBarracksLvl === 0 ? 'DISABLED' : topBarracksLvl === 1 ? 'Next: Lvl 2 (unlocks Mages)' : topBarracksLvl === 2 ? 'Next: Lvl 3 (unlocks Siege Tanks)' : 'Max Level reached'
})}
onMouseLeave={() => setHoveredCommand(null)}
>
<div className="w3-hotkey-badge">Q</div>
<div className="w-full h-full flex flex-col items-center justify-center text-slate-200 pt-3.5">
<span className="text-lg">{topBarracksLvl === 0 ? '🚫' : '🔼'}</span>
<span className="text-[8px] font-extrabold mt-0.5">{topBarracksLvl === 0 ? 'LOCKED' : 'TOP'}</span>
</div>
</button>

<button
onClick={() => onSendAction({ type: 'upgrade_barracks', lane: 'middle' })}
disabled={midBarracksLvl === 0 || midBarracksLvl >= 3 || pState.gold < getUpgradeCost(midBarracksLvl)}
className={`w3-cmd-btn ${midBarracksLvl === 0 ? 'opacity-50' : ''}`}
onMouseEnter={() => setHoveredCommand({
name: 'Upgrade Mid Barracks',
hotkey: 'W',
goldCost: midBarracksLvl === 0 ? undefined : getUpgradeCost(midBarracksLvl),
desc: midBarracksLvl === 0 ? 'This barracks is disabled for this match.' : `Upgrades middle lane troop composition to spawn stronger classes. Current level: Lvl ${midBarracksLvl}/3.`,
stats: midBarracksLvl === 0 ? 'DISABLED' : midBarracksLvl === 1 ? 'Next: Lvl 2 (unlocks Mages)' : midBarracksLvl === 2 ? 'Next: Lvl 3 (unlocks Siege Tanks)' : 'Max Level reached'
})}
onMouseLeave={() => setHoveredCommand(null)}
>
<div className="w3-hotkey-badge">W</div>
<div className="w-full h-full flex flex-col items-center justify-center text-slate-200 pt-3.5">
<span className="text-lg">{midBarracksLvl === 0 ? '🚫' : '🔼'}</span>
<span className="text-[8px] font-extrabold mt-0.5">{midBarracksLvl === 0 ? 'LOCKED' : 'MID'}</span>
</div>
</button>

<button
onClick={() => onSendAction({ type: 'upgrade_barracks', lane: 'bottom' })}
disabled={botBarracksLvl === 0 || botBarracksLvl >= 3 || pState.gold < getUpgradeCost(botBarracksLvl)}
className={`w3-cmd-btn ${botBarracksLvl === 0 ? 'opacity-50' : ''}`}
onMouseEnter={() => setHoveredCommand({
name: 'Upgrade Bottom Barracks',
hotkey: 'E',
goldCost: botBarracksLvl === 0 ? undefined : getUpgradeCost(botBarracksLvl),
desc: botBarracksLvl === 0 ? 'This barracks is disabled for this match.' : `Upgrades bottom lane troop composition to spawn stronger classes. Current level: Lvl ${botBarracksLvl}/3.`,
stats: botBarracksLvl === 0 ? 'DISABLED' : botBarracksLvl === 1 ? 'Next: Lvl 2 (unlocks Mages)' : botBarracksLvl === 2 ? 'Next: Lvl 3 (unlocks Siege Tanks)' : 'Max Level reached'
})}
onMouseLeave={() => setHoveredCommand(null)}
>
<div className="w3-hotkey-badge">E</div>
<div className="w-full h-full flex flex-col items-center justify-center text-slate-200 pt-3.5">
<span className="text-lg">{botBarracksLvl === 0 ? '🚫' : '🔼'}</span>
<span className="text-[8px] font-extrabold mt-0.5">{botBarracksLvl === 0 ? 'LOCKED' : 'BOT'}</span>
</div>
</button>

<button
onClick={() => onSendAction({ type: 'summon_hero' })}
disabled={pState.heroSummoned || pState.gold < 350}
className="w3-cmd-btn"
onMouseEnter={() => setHoveredCommand({
name: `Summon ${commander.name}`,
hotkey: 'R',
goldCost: 350,
desc: `Summons the legendary ${commander.name} onto the diagonal middle lane. One-time summon per match.`,
stats: pState.heroSummoned ? 'Champion already in battle' : 'Hero available'
})}
onMouseLeave={() => setHoveredCommand(null)}
>
<div className="w3-hotkey-badge">R</div>
<div className="w-full h-full flex flex-col items-center justify-center text-slate-200 pt-3.5">
<span className="text-lg">👑</span>
<span className="text-[8px] font-extrabold mt-0.5">HERO</span>
</div>
</button>


{/* ROW 2: Mercenaries (A, S, D, F) deployed on selectedLane */}
<button
onClick={() => onSendAction({ type: 'hire_mercenary', lane: selectedLane, unitType: 'melee' })}
disabled={pState.barracksLevel[selectedLane] === 0 || pState.gold < unitConfigs.melee.cost}
className={`w3-cmd-btn ${pState.barracksLevel[selectedLane] === 0 ? 'opacity-40' : ''}`}
onMouseEnter={() => setHoveredCommand({
name: `Recruit ${unitConfigs.melee.name}`,
hotkey: 'A',
goldCost: pState.barracksLevel[selectedLane] === 0 ? undefined : unitConfigs.melee.cost,
desc: pState.barracksLevel[selectedLane] === 0 ? 'Cannot recruit forces on a disabled lane.' : `${unitConfigs.melee.desc} Deploys instantly in front of your base gates on the ${selectedLane} lane.`,
stats: pState.barracksLevel[selectedLane] === 0 ? 'LOCKED' : `type: melee combatant | lane target: ${selectedLane}`
})}
onMouseLeave={() => setHoveredCommand(null)}
>
<div className="w3-hotkey-badge">A</div>
<div className="w-full h-full flex flex-col items-center justify-center text-slate-200 pt-3.5">
<span className="text-lg">{pState.barracksLevel[selectedLane] === 0 ? '🚫' : unitConfigs.melee.icon}</span>
<span className="text-[8px] font-extrabold mt-0.5">MELEE</span>
</div>
</button>

<button
onClick={() => onSendAction({ type: 'hire_mercenary', lane: selectedLane, unitType: 'ranged' })}
disabled={pState.barracksLevel[selectedLane] === 0 || pState.gold < unitConfigs.ranged.cost}
className={`w3-cmd-btn ${pState.barracksLevel[selectedLane] === 0 ? 'opacity-40' : ''}`}
onMouseEnter={() => setHoveredCommand({
name: `Recruit ${unitConfigs.ranged.name}`,
hotkey: 'S',
goldCost: pState.barracksLevel[selectedLane] === 0 ? undefined : unitConfigs.ranged.cost,
desc: pState.barracksLevel[selectedLane] === 0 ? 'Cannot recruit forces on a disabled lane.' : `${unitConfigs.ranged.desc} Deploys instantly in front of your base gates on the ${selectedLane} lane.`,
stats: pState.barracksLevel[selectedLane] === 0 ? 'LOCKED' : `type: ranged attacker | lane target: ${selectedLane}`
})}
onMouseLeave={() => setHoveredCommand(null)}
>
<div className="w3-hotkey-badge">S</div>
<div className="w-full h-full flex flex-col items-center justify-center text-slate-200 pt-3.5">
<span className="text-lg">{pState.barracksLevel[selectedLane] === 0 ? '🚫' : unitConfigs.ranged.icon}</span>
<span className="text-[8px] font-extrabold mt-0.5">RANGED</span>
</div>
</button>

<button
onClick={() => onSendAction({ type: 'hire_mercenary', lane: selectedLane, unitType: 'mage' })}
disabled={pState.barracksLevel[selectedLane] === 0 || pState.gold < unitConfigs.mage.cost}
className={`w3-cmd-btn ${pState.barracksLevel[selectedLane] === 0 ? 'opacity-40' : ''}`}
onMouseEnter={() => setHoveredCommand({
name: `Recruit ${unitConfigs.mage.name}`,
hotkey: 'D',
goldCost: pState.barracksLevel[selectedLane] === 0 ? undefined : unitConfigs.mage.cost,
desc: pState.barracksLevel[selectedLane] === 0 ? 'Cannot recruit forces on a disabled lane.' : `${unitConfigs.mage.desc} Deploys instantly in front of your base gates on the ${selectedLane} lane.`,
stats: pState.barracksLevel[selectedLane] === 0 ? 'LOCKED' : `type: wizard spellcaster | lane target: ${selectedLane}`
})}
onMouseLeave={() => setHoveredCommand(null)}
>
<div className="w3-hotkey-badge">D</div>
<div className="w-full h-full flex flex-col items-center justify-center text-slate-200 pt-3.5">
<span className="text-lg">{pState.barracksLevel[selectedLane] === 0 ? '🚫' : unitConfigs.mage.icon}</span>
<span className="text-[8px] font-extrabold mt-0.5">MAGE</span>
</div>
</button>

<button
onClick={() => onSendAction({ type: 'hire_mercenary', lane: selectedLane, unitType: 'siege' })}
disabled={pState.barracksLevel[selectedLane] === 0 || pState.gold < unitConfigs.siege.cost}
className={`w3-cmd-btn ${pState.barracksLevel[selectedLane] === 0 ? 'opacity-40' : ''}`}
onMouseEnter={() => setHoveredCommand({
name: `Recruit ${unitConfigs.siege.name}`,
hotkey: 'F',
goldCost: pState.barracksLevel[selectedLane] === 0 ? undefined : unitConfigs.siege.cost,
desc: pState.barracksLevel[selectedLane] === 0 ? 'Cannot recruit forces on a disabled lane.' : `${unitConfigs.siege.desc} Deploys instantly in front of your base gates on the ${selectedLane} lane.`,
stats: pState.barracksLevel[selectedLane] === 0 ? 'LOCKED' : `type: heavy structure siege tank | lane target: ${selectedLane}`
})}
onMouseLeave={() => setHoveredCommand(null)}
>
<div className="w3-hotkey-badge">F</div>
<div className="w-full h-full flex flex-col items-center justify-center text-slate-200 pt-3.5">
<span className="text-lg">{pState.barracksLevel[selectedLane] === 0 ? '🚫' : unitConfigs.siege.icon}</span>
<span className="text-[8px] font-extrabold mt-0.5">SIEGE</span>
</div>
</button>


{/* ROW 3: Spells (Z, X, C, V) cast on selectedLane */}
<button
onClick={() => onSendAction({ type: 'cast_spell', lane: selectedLane, spellType: 'meteor' })}
disabled={pState.mana < 15}
className="w3-cmd-btn"
onMouseEnter={() => setHoveredCommand({
name: 'Cast Hellfire Meteor',
hotkey: 'Z',
manaCost: 15,
desc: 'Launches a flaming meteor on the selected lane, dealing 170 damage and burning all hostile enemies.',
stats: `effect: damage storm | target: ${selectedLane} lane`
})}
onMouseLeave={() => setHoveredCommand(null)}
>
<div className="w3-hotkey-badge">Z</div>
<div className="w-full h-full flex flex-col items-center justify-center text-slate-200 pt-3.5">
<span className="text-lg">☄️</span>
<span className="text-[8px] font-extrabold mt-0.5">METEOR</span>
</div>
</button>

<button
onClick={() => onSendAction({ type: 'cast_spell', lane: selectedLane, spellType: 'storm' })}
disabled={pState.mana < 15}
className="w3-cmd-btn"
onMouseEnter={() => setHoveredCommand({
name: 'Cast Blizzard Storm',
hotkey: 'X',
manaCost: 15,
desc: 'Summons a freezing blizzard on the selected lane, dealing 120 damage and slowing enemy move speeds by 35%.',
stats: `effect: slow & damage storm | target: ${selectedLane} lane`
})}
onMouseLeave={() => setHoveredCommand(null)}
>
<div className="w3-hotkey-badge">X</div>
<div className="w-full h-full flex flex-col items-center justify-center text-slate-200 pt-3.5">
<span className="text-lg">❄️</span>
<span className="text-[8px] font-extrabold mt-0.5">BLIZZARD</span>
</div>
</button>

<button
onClick={() => onSendAction({ type: 'cast_spell', lane: selectedLane, spellType: 'bloodlust' })}
disabled={pState.mana < 15}
className="w3-cmd-btn"
onMouseEnter={() => setHoveredCommand({
name: 'Cast Horde Bloodlust',
hotkey: 'C',
manaCost: 15,
desc: 'Drenches all allied units on the selected lane in a bloodlust fury, increasing their movement velocity by 40%.',
stats: `effect: movement rate buff | target: ${selectedLane} lane`
})}
onMouseLeave={() => setHoveredCommand(null)}
>
<div className="w3-hotkey-badge">C</div>
<div className="w-full h-full flex flex-col items-center justify-center text-slate-200 pt-3.5">
<span className="text-lg">🔥</span>
<span className="text-[8px] font-extrabold mt-0.5">RAGE</span>
</div>
</button>

{pState.ultimateResearched ? (
<button
onClick={() => onSendAction({ type: 'cast_spell', lane: selectedLane, spellType: 'ultimate' })}
disabled={pState.mana < 50}
className="w3-cmd-btn border-amber-500 shadow-amber-500/20"
onMouseEnter={() => setHoveredCommand({
name: 'Cast Ultimate Doom',
hotkey: 'V',
manaCost: 50,
desc: 'Unleashes the ultimate weapon of your faction. Launches a global meteor strike dealing 350 damage to all enemy units on the map, and spawns an elite vanguard doom wave in all three lanes.',
stats: 'spawns: Elite Doom Tank & 2 Elite Warcasters per lane'
})}
onMouseLeave={() => setHoveredCommand(null)}
>
<div className="w3-hotkey-badge bg-amber-750 border-amber-400">V</div>
<div className="w-full h-full flex flex-col items-center justify-center text-amber-400 pt-3.5">
<span className="text-lg animate-pulse">💥</span>
<span className="text-[8px] font-extrabold mt-0.5 text-amber-300">ULTIMATE</span>
</div>
</button>
) : (
<button
onClick={() => onSendAction({ type: 'cast_spell', lane: selectedLane, spellType: 'scourge_raise' })}
disabled={pState.mana < 15}
className="w3-cmd-btn"
onMouseEnter={() => setHoveredCommand({
name: 'Raise Skeletal Servants',
hotkey: 'V',
manaCost: 15,
desc: 'Raises a squad of 3 skeletons from the ground to fight for your faction on the selected lane.',
stats: `effect: raise 3 skeletons | target: ${selectedLane} lane`
})}
onMouseLeave={() => setHoveredCommand(null)}
>
<div className="w3-hotkey-badge">V</div>
<div className="w-full h-full flex flex-col items-center justify-center text-slate-200 pt-3.5">
<span className="text-lg">💀</span>
<span className="text-[8px] font-extrabold mt-0.5">RAISE</span>
</div>
</button>
)}

</div>

</div>

</div>

</div>
);
};
