import { getAudioContext, setAudioContext, initAudio, registerSynthSounds, samples, registerSound, getSound } from 'superdough';
import { webaudioRepl } from '@strudel/webaudio';
import { transpiler } from '@strudel/transpiler';
import { evalScope } from '@strudel/core';
import * as core from '@strudel/core';
import { miniAllStrings, m } from '@strudel/mini';

let repl: ReturnType<typeof webaudioRepl> | null = null;
let ready = false;
let initPromise: Promise<void> | null = null;
const localSampleBuffers = new Map<string, AudioBuffer[]>();

async function loadLocalSamples() {
  try {
    const sampleDirs = await window.api.listSamples();
    let totalFiles = 0;
    for (const [category, files] of Object.entries(sampleDirs)) {
      if (getSound(category)) {
        console.log(`[samples] "${category}" already registered, skipping local`);
        totalFiles += files.length;
        continue;
      }
      const bufs: AudioBuffer[] = [];
      const audioCtx = getAudioContext();
      for (const file of files) {
        if (!file.path.match(/\.(wav|mp3|ogg)$/i)) continue;
        const { data: base64Data } = await window.api.readSampleFile(file.path);
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        try {
          const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer);
          bufs.push(audioBuffer);
        } catch (e) {
          console.warn(`Failed to decode ${file.path}:`, e);
        }
      }
      if (bufs.length === 0) continue;
      localSampleBuffers.set(category, bufs);
      registerSound(category, localSampleTrigger, { type: 'sample', category });
      totalFiles += bufs.length;
    }
    if (localSampleBuffers.size > 0) {
      console.log(`Registered ${localSampleBuffers.size} categories with ${totalFiles} local samples`);
    }
  } catch (e) {
    console.warn('No local samples loaded:', e);
  }
}

function localSampleTrigger(t: number, value: any, onended: (() => void) | undefined, bank: any) {
  const ac = getAudioContext();
  const bufs = localSampleBuffers.get(bank.category);
  if (!bufs || bufs.length === 0) return;
  const idx = value.n !== undefined ? Math.abs(Number(value.n) || 0) % bufs.length : 0;
  const buf = bufs[idx];
  const source = ac.createBufferSource();
  source.buffer = buf;
  const gain = ac.createGain();
  const amp = value.gain ?? value.amp ?? 1;
  const speed = value.speed ?? 1;
  if (value.note !== undefined) {
    const noteNames = ['c','c#','d','d#','e','f','f#','g','g#','a','a#','b'];
    const match = String(value.note).toLowerCase().match(/^([a-g]#?)(\d+)?$/);
    if (match) {
      const midi = noteNames.indexOf(match[1]) + (parseInt(match[2] || '4') + 1) * 12;
      if (midi > 0) source.playbackRate.value = 440 * Math.pow(2, (midi - 69) / 12) / 261.63;
    }
  }
  source.playbackRate.value = speed;
  gain.gain.setValueAtTime(amp, t);
  source.connect(gain);
  gain.connect(ac.destination);
  source.start(t);
  source.stop(t + buf.duration / Math.abs(source.playbackRate.value || 1));
  if (onended) source.onended = onended;
}

export async function init() {
  if (ready) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    miniAllStrings();

    const audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    setAudioContext(audioCtx);

    await initAudio();
    await registerSynthSounds();

    try {
      const correctBase = 'https://raw.githubusercontent.com/tidalcycles/dirt-samples/main/';
      await samples('github:tidalcycles/dirt-samples', correctBase);
    } catch (e) {
      console.warn('Failed to load dirt-samples, using synths only:', e);
    }

    await loadLocalSamples();

    repl = webaudioRepl({ transpiler });

    await evalScope(
      import('@strudel/core'),
      import('@strudel/mini'),
      import('@strudel/tonal'),
      import('@strudel/webaudio'),
    );

    ready = true;
  })();

  return initPromise;
}

export async function downloadDirtSamples(): Promise<{ total: number; downloaded: number; errors: number } | undefined> {
  if (!window.api.downloadDirtSamples) return;
  const result = await window.api.downloadDirtSamples();
  await loadLocalSamples();
  return result;
}

export async function playPattern(code: string) {
  if (!ready) await init();
  if (!repl) return;
  try {
    await repl.evaluate(code, true);
  } catch (e) {
    console.error('playPattern error:', e);
  }
}

export function stopPattern() {
  repl?.stop();
}

export async function renderToWav(
  code: string,
  bpm: number,
  bars: number
): Promise<ArrayBuffer> {
  if (!ready) await init();

  const scope2: Record<string, any> = {};
  for (const key of Object.getOwnPropertyNames(core)) {
    scope2[key] = (core as any)[key];
  }
  scope2.m = m;
  const { output } = transpiler(code);
  const keys = Object.keys(scope2);
  const vals = keys.map((k) => scope2[k]);
  const pattern = Function(...keys, output)(...vals);

  if (!pattern || typeof pattern.queryArc !== 'function') {
    throw new Error('Invalid pattern');
  }

  const cps = bpm / 60;
  const totalBeats = bars * 4;
  const sampleRate = 44100;
  const durSamples = Math.floor(sampleRate * totalBeats * (60 / bpm));
  const offCtx = new OfflineAudioContext(2, durSamples, sampleRate);
  const master = offCtx.createGain();
  master.gain.value = 0.7;
  master.connect(offCtx.destination);

  const events = pattern.queryArc(0, totalBeats, { _cps: cps });

  for (const hap of events) {
    const t = Number(hap.part.begin) / cps;
    const dur = Math.max(
      (Number(hap.part.end) - Number(hap.part.begin)) / cps,
      0.05
    );
    const vals2 = hap.value || {};
    const gain = Number(vals2.gain || vals2.amp || 1);

    if (vals2.s) {
      renderDrum(offCtx, master, String(vals2.s), t, gain);
    }
    if (vals2.note !== undefined) {
      const n =
        typeof vals2.note === 'number'
          ? vals2.note
          : noteToMidi(vals2.note);
      if (n > 0) {
        const freq = 440 * Math.pow(2, (n - 69) / 12);
        renderSynth(offCtx, master, freq, t, dur, gain);
      }
    } else if (vals2.n !== undefined) {
      const n = Number(vals2.n);
      if (!isNaN(n) && n > 0) {
        const freq = 440 * Math.pow(2, (n - 69) / 12);
        renderSynth(offCtx, master, freq, t, dur, gain);
      }
    }
  }

  const rendered = await offCtx.startRendering();
  return encodeWav(rendered);
}

function noteToMidi(note: string): number {
  const NOTES: Record<string, number> = {
    c: 0, 'c#': 1, db: 1, d: 2, 'd#': 3, eb: 3, e: 4, f: 5, 'f#': 6,
    gb: 6, g: 7, 'g#': 8, ab: 8, a: 9, 'a#': 10, bb: 10, b: 11,
  };
  const m = note.toLowerCase().match(/^([a-g][#b]?)(\d+)?$/);
  if (m && NOTES[m[1]] !== undefined) {
    return NOTES[m[1]] + (parseInt(m[2] || '4') + 1) * 12;
  }
  return 0;
}

function renderDrum(ctx: OfflineAudioContext, out: AudioNode, sound: string, t: number, gain: number) {
  const s = sound.toLowerCase();
  switch (s) {
    case 'bd': case 'kick': {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(g); g.connect(out); osc.start(t); osc.stop(t + 0.4);
      return;
    }
    case 'sd': case 'sn': case 'snare': {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = 'triangle'; osc.frequency.setValueAtTime(200, t);
      g.gain.setValueAtTime(0.7 * gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(g); g.connect(out); osc.start(t); osc.stop(t + 0.15);
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
      const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const n = ctx.createBufferSource(); n.buffer = buf;
      const ng = ctx.createGain(); ng.gain.setValueAtTime(0.5 * gain, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      n.connect(ng); ng.connect(out); n.start(t); n.stop(t + 0.12);
      return;
    }
    case 'hh': case 'ch': case 'closedhat': case 'closed_hh':
      noiseHit(ctx, out, t, 0.04, 7000, 0.3 * gain); return;
    case 'oh': case 'openhat': case 'open_hh':
      noiseHit(ctx, out, t, 0.15, 5000, 0.3 * gain); return;
    case 'cp': case 'clap':
      noiseHit(ctx, out, t, 0.08, 3000, 0.4 * gain, 'bandpass'); return;
    default:
      noiseHit(ctx, out, t, 0.06, 7000, 0.3 * gain);
  }
}

function noiseHit(ctx: OfflineAudioContext, out: AudioNode, t: number, dur: number, freq: number, gain: number, filterType?: BiquadFilterType) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const n = ctx.createBufferSource(); n.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = filterType || 'highpass'; f.frequency.value = freq;
  if (filterType === 'bandpass') f.Q.value = 2;
  const g = ctx.createGain(); g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  n.connect(f); f.connect(g); g.connect(out);
  n.start(t); n.stop(t + dur);
}

function renderSynth(ctx: OfflineAudioContext, out: AudioNode, freq: number, t: number, dur: number, gain: number) {
  const osc = ctx.createOscillator(); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
  osc.type = 'sawtooth'; osc.frequency.setValueAtTime(freq, t);
  f.type = 'lowpass'; f.frequency.setValueAtTime(Math.min(freq * 6, 12000), t);
  f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
  g.gain.setValueAtTime(0.25 * gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(f); f.connect(g); g.connect(out);
  osc.start(t); osc.stop(t + dur + 0.01);
}

function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const nCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const ba = nCh * 2;
  const samps: Float32Array[] = [];
  for (let ch = 0; ch < nCh; ch++) samps.push(buffer.getChannelData(ch));
  const nS = samps[0].length;
  const ds = nS * ba;
  const ts = 44 + ds;
  const b = new ArrayBuffer(ts);
  const v = new DataView(b);
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, 'RIFF'); v.setUint32(4, ts - 8, true); w(8, 'WAVE');
  w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, nCh, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * ba, true); v.setUint16(32, ba, true);
  v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, ds, true);
  let o = 44;
  for (let i = 0; i < nS; i++) {
    for (let ch = 0; ch < nCh; ch++) {
      const s = Math.max(-1, Math.min(1, samps[ch][i]));
      v.setInt16(o, (s < 0 ? s * 0x8000 : s * 0x7fff) | 0, true); o += 2;
    }
  }
  return b;
}
