// 📝 PATCH NOTES REMINDER: If you add or change sound effects or the audio engine,
// add an entry to the TOP of src/patchNotes.ts describing the change.
import { GameState } from './types';

class SoundManager {
private ctx: AudioContext | null = null;
private playedIds = new Set<string>();
private globalVolume = 0.25; // Default 25% volume
private cameraRef = { x: 900, y: 900, zoom: 1.35 };

setVolume(vol: number) {
this.globalVolume = Math.max(0, Math.min(1, vol));
}

getVolume() {
return this.globalVolume;
}

setCamera(x: number, y: number, zoom: number) {
this.cameraRef = { x, y, zoom };
}

private init() {
if (!this.ctx) {
// @ts-ignore
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
if (AudioContextClass) {
this.ctx = new AudioContextClass();
}
}
if (this.ctx && this.ctx.state === 'suspended') {
this.ctx.resume().catch((err) => console.warn('AudioContext resume failed:', err));
}
}

// Play a retro UI click sound
playUiClick() {
this.init();
if (!this.ctx) return;

const now = this.ctx.currentTime;
const osc = this.ctx.createOscillator();
const gain = this.ctx.createGain();

osc.type = 'triangle';
osc.frequency.setValueAtTime(160, now);
osc.frequency.exponentialRampToValueAtTime(10, now + 0.1);

gain.gain.setValueAtTime(this.globalVolume * 0.5, now);
gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

osc.connect(gain);
gain.connect(this.ctx.destination);

osc.start(now);
osc.stop(now + 0.1);
}

playSpatial(type: string, x: number, y: number) {
this.init();
if (!this.ctx || this.globalVolume <= 0) return;

// Calculate distance and horizontal difference from camera center
const dx = x - this.cameraRef.x;
const dy = y - this.cameraRef.y;
const distance = Math.sqrt(dx * dx + dy * dy);

// Audio falloff: maximum distance the sound can carry
const maxAudibleDistance = 1400; 
if (distance > maxAudibleDistance) return;

// Inverse linear distance attenuation
const volumeFactor = Math.max(0, 1 - distance / maxAudibleDistance);

// Panning calculations (-1 left channel to +1 right channel)
// Scale horizontal distance relative to half screen mapping size (~600 units)
const panFactor = Math.max(-1, Math.min(1, dx / 600));

const now = this.ctx.currentTime;
const gainNode = this.ctx.createGain();

// Total sound volume is the product of global volume and distance attenuation
gainNode.gain.setValueAtTime(this.globalVolume * volumeFactor, now);

let destinationNode: AudioNode = this.ctx.destination;

// Set up stereo panner if the browser supports it
if (this.ctx.createStereoPanner) {
const pannerNode = this.ctx.createStereoPanner();
pannerNode.pan.setValueAtTime(panFactor, now);
pannerNode.connect(this.ctx.destination);
destinationNode = pannerNode;
}

gainNode.connect(destinationNode);

// Synthesize themed audio shapes
switch (type) {
case 'meteor': {
// Deep low-pass explosion rumble
const bufferSize = this.ctx.sampleRate * 0.9;
const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
const data = buffer.getChannelData(0);
for (let i = 0; i < bufferSize; i++) {
data[i] = Math.random() * 2 - 1;
}

const noiseNode = this.ctx.createBufferSource();
noiseNode.buffer = buffer;

const filterNode = this.ctx.createBiquadFilter();
filterNode.type = 'lowpass';
filterNode.frequency.setValueAtTime(280, now);
filterNode.frequency.exponentialRampToValueAtTime(10, now + 0.85);

gainNode.gain.setValueAtTime(this.globalVolume * volumeFactor * 1.6, now);
gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

noiseNode.connect(filterNode);
filterNode.connect(gainNode);
noiseNode.start(now);
break;
}

case 'lightning': {
// Electrifying lightning crackle
const osc = this.ctx.createOscillator();
osc.type = 'sawtooth';
osc.frequency.setValueAtTime(900, now);
osc.frequency.linearRampToValueAtTime(150, now + 0.28);

const filter = this.ctx.createBiquadFilter();
filter.type = 'bandpass';
filter.frequency.setValueAtTime(1000, now);

gainNode.gain.setValueAtTime(this.globalVolume * volumeFactor * 0.7, now);
gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

osc.connect(filter);
filter.connect(gainNode);
osc.start(now);
osc.stop(now + 0.28);
break;
}

case 'heal': {
// Sparkly chime chord (rising arpeggio notes)
const playChimeNote = (freq: number, delayTime: number) => {
if (!this.ctx) return;
const oscNode = this.ctx.createOscillator();
const noteGain = this.ctx.createGain();

oscNode.type = 'sine';
oscNode.frequency.setValueAtTime(freq, now + delayTime);

noteGain.gain.setValueAtTime(this.globalVolume * volumeFactor * 0.35, now + delayTime);
noteGain.gain.exponentialRampToValueAtTime(0.001, now + delayTime + 0.3);

oscNode.connect(noteGain);
noteGain.connect(destinationNode);
oscNode.start(now + delayTime);
oscNode.stop(now + delayTime + 0.35);
};

playChimeNote(523.25, 0);      // C5
playChimeNote(659.25, 0.07);   // E5
playChimeNote(783.99, 0.14);   // G5
playChimeNote(1046.50, 0.21);  // C6
break;
}

case 'bloodlust': {
// Deep charging roar
const osc = this.ctx.createOscillator();
osc.type = 'triangle';
osc.frequency.setValueAtTime(180, now);
osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);

gainNode.gain.setValueAtTime(this.globalVolume * volumeFactor * 1.3, now);
gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

osc.connect(gainNode);
osc.start(now);
osc.stop(now + 0.5);
break;
}

case 'explosion': {
// Fireball or building detonation
const osc = this.ctx.createOscillator();
osc.type = 'triangle';
osc.frequency.setValueAtTime(140, now);
osc.frequency.exponentialRampToValueAtTime(20, now + 0.22);

gainNode.gain.setValueAtTime(this.globalVolume * volumeFactor * 1.1, now);
gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

osc.connect(gainNode);
osc.start(now);
osc.stop(now + 0.22);
break;
}

case 'slash': {
// High frequency blade swoosh
const osc = this.ctx.createOscillator();
osc.type = 'triangle';
osc.frequency.setValueAtTime(500, now);
osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);

gainNode.gain.setValueAtTime(this.globalVolume * volumeFactor * 0.45, now);
gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

osc.connect(gainNode);
osc.start(now);
osc.stop(now + 0.12);
break;
}

case 'scourge_dead': {
// Spooky undead resurrect chime
const osc = this.ctx.createOscillator();
osc.type = 'sine';
osc.frequency.setValueAtTime(90, now);
osc.frequency.exponentialRampToValueAtTime(320, now + 0.45);

gainNode.gain.setValueAtTime(this.globalVolume * volumeFactor * 0.6, now);
gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

osc.connect(gainNode);
osc.start(now);
osc.stop(now + 0.45);
break;
}

case 'shoot': {
// Subtle projectile flying start
const osc = this.ctx.createOscillator();
osc.type = 'sine';
osc.frequency.setValueAtTime(1100, now);
osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);

gainNode.gain.setValueAtTime(this.globalVolume * volumeFactor * 0.18, now);
gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

osc.connect(gainNode);
osc.start(now);
osc.stop(now + 0.08);
break;
}
}
}

processStateUpdates(gameState: GameState) {
if (gameState.status !== 'playing') return;

// Trigger visual effects audio
if (gameState.effects) {
gameState.effects.forEach((fx) => {
if (!this.playedIds.has(fx.id)) {
this.playedIds.add(fx.id);
this.playSpatial(fx.type, fx.x, fx.y);
}
});
}

// Trigger projectile shoot audio
if (gameState.projectiles) {
gameState.projectiles.forEach((p) => {
if (!this.playedIds.has(p.id)) {
this.playedIds.add(p.id);
this.playSpatial('shoot', p.startX, p.startY);
}
});
}

// Periodically reset tracking set to control memory footprint
if (this.playedIds.size > 1500) {
this.playedIds.clear();
}
}
}

export const soundManager = new SoundManager();
