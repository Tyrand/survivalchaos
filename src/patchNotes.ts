/**
* PATCH NOTES
* ===========
* Add a new entry to the TOP of this array whenever you make a notable change.
* These are displayed on the lobby screen for all players to see.
*
* Format:
*   v: semver string e.g. 'v2.5.0'
*   date: short human date e.g. 'Jun 16' or 'Today'
*   note: one-line plain-English description of the change
*
* REMINDER: Keep this file updated when editing:
*   - src/engine.ts         (game logic, units, waves, balance)
*   - src/server.ts         (server rules, win conditions, networking)
*   - src/types.ts          (new unit/effect/building types)
*   - src/components/GameCanvas.tsx  (rendering, camera, visual changes)
*   - src/audio.ts          (new sound effects, audio changes)
*/

export interface PatchNote {
v: string;
date: string;
note: string;
}

export const PATCH_NOTES: PatchNote[] = [
// ↓ Add newest entries at the TOP
{ v: 'v2.4.1', date: 'Jun 15', note: 'Added spatial stereo audio engine with camera-relative panning.' },
{ v: 'v2.4.0', date: 'Jun 15', note: 'Neutral buildings now award passive gold, armor & speed bonuses.' },
{ v: 'v2.3.2', date: 'Jun 14', note: 'Fixed lobby UI canvas stretch on widescreen monitors.' },
{ v: 'v2.3.0', date: 'Jun 13', note: 'Added mounted cavalry, air units, 13 neutral building types.' },
];
