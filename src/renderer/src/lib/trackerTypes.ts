export type NoteName =
  | 'C-' | 'C#' | 'D-' | 'D#' | 'E-' | 'F-' | 'F#' | 'G-' | 'G#' | 'A-' | 'A#' | 'B-';

export interface Pos {
  row: number;
  track: number;
}

export interface TrackerCell {
  note: NoteName | null;
  octave: number | null;
  instrument: string | null;
  volume: number | null;
}

export interface TrackerTrack {
  name: string;
  instrument: string;
  sampleIndex: number;
  cells: TrackerCell[];
}

export interface TrackerPattern {
  id: string;
  name: string;
  rows: number;
  tracks: TrackerTrack[];
}

export interface SongSlot {
  patternId: string;
  patternName: string;
  repeats: number;
}

export interface TrackerSong {
  patterns: TrackerPattern[];
  sequence: SongSlot[];
  bpm: number;
}

export const NOTE_NAMES: NoteName[] = [
  'C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-',
];

export function noteToStr(note: NoteName | null, oct: number | null): string {
  if (!note || oct === null) return '---';
  return `${note}${oct}`;
}

export function strToNote(s: string): { note: NoteName | null; octave: number | null } {
  const m = s.match(/^([A-G][#-]?)(\d)$/);
  if (!m) return { note: null, octave: null };
  const n = m[1].padEnd(2, '-') as NoteName;
  return NOTE_NAMES.includes(n) ? { note: n, octave: parseInt(m[2]) } : { note: null, octave: null };
}

export const DEFAULT_PATTERN_ROWS = 64;
export const DEFAULT_TRACK_NAMES = ['bd', 'sd', 'hh', 'synth'];
