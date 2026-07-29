import {
  TrackerSong, TrackerPattern, TrackerTrack, TrackerCell,
  NoteName, NOTE_NAMES, DEFAULT_PATTERN_ROWS,
} from './trackerTypes';

function stripComments(code: string): string {
  return code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function findMatchingParen(s: string, start: number): number {
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === '(') depth++;
    if (s[i] === ')') depth--;
    if (depth < 0) return i;
  }
  return -1;
}

function extractStringArg(code: string, funcName: string): string | null {
  const re = new RegExp(`${funcName}\\s*\\(\\s*["']([^"']+)["']\\s*\\)`);
  const m = code.match(re);
  return m ? m[1] : null;
}

function expandNoteSequence(seq: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < seq.length) {
    if (seq[i] === ' ') { i++; continue; }
    if (seq[i] === '"') break;
    if (seq[i] === '[') {
      let depth = 1;
      let j = i + 1;
      while (j < seq.length && depth > 0) {
        if (seq[j] === '[') depth++;
        if (seq[j] === ']') depth--;
        j++;
      }
      const inner = seq.slice(i + 1, j - 1).trim();
      const innerTokens = inner.split(/\s+/).filter(Boolean);
      tokens.push(...innerTokens);
      i = j;
    } else if (seq[i] === '{') {
      let depth = 1;
      let j = i + 1;
      while (j < seq.length && depth > 0) {
        if (seq[j] === '{') depth++;
        if (seq[j] === '}') depth--;
        j++;
      }
      const inner = seq.slice(i + 1, j - 1).trim();
      const innerTokens = inner.split(/\s+/).filter(Boolean);
      tokens.push(innerTokens[0] || '~');
      i = j;
    } else if (seq[i] === '~') {
      tokens.push('~');
      i++;
    } else {
      let j = i;
      while (j < seq.length && !/[\s\[\]{}~"]/.test(seq[j])) j++;
      let tok = seq.slice(i, j);
      const bangM = tok.match(/^(.+)!(\d+)$/);
      if (bangM) {
        for (let k = 0; k < parseInt(bangM[2]); k++) tokens.push(bangM[1]);
      } else {
        tokens.push(tok);
      }
      i = j;
    }
  }
  return tokens.length ? tokens : ['~'];
}

function parseNoteToken(tok: string): TrackerCell {
  const cell: TrackerCell = { note: null, octave: null, instrument: null, volume: null };
  if (tok === '~' || tok === '.') return cell;
  const m = tok.match(/^([A-Ga-g][#-]?)(\d+)?$/);
  if (m) {
    const raw = m[1].toUpperCase().padEnd(2, '-') as NoteName;
    cell.note = NOTE_NAMES.includes(raw) ? raw : null;
    cell.octave = m[2] ? parseInt(m[2]) : null;
  }
  return cell;
}

function generateNoteValue(cell: TrackerCell): string {
  if (!cell.note || cell.octave === null) return '~';
  return `${cell.note}${cell.octave}`;
}

function extractStackChildren(code: string): string[] {
  const stripped = stripComments(code);
  const stackM = stripped.match(/\bstack\s*\(/);
  if (!stackM) return [code.trim()];
  const start = stackM.index! + stackM[0].length - 1;
  const end = findMatchingParen(stripped, start);
  if (end < 0) return [code.trim()];
  const inner = stripped.slice(start + 1, end);
  const children: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of inner) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) {
      children.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) children.push(cur.trim());
  return children.length ? children : [code.trim()];
}

function parseTrack(code: string): { sound: string; notes: string[]; sampleIndex: number } {
  let sound = extractStringArg(code, 's') || 'synth';
  if (sound === 'superpiano') sound = 'synth';
  const noteStr = extractStringArg(code, 'note');
  const nStr = extractStringArg(code, 'n');
  let notes = noteStr ? expandNoteSequence(noteStr) : [];
  const sampleIndex = nStr ? parseInt(nStr.split(/\s+/)[0]) || 0 : 0;
  if (!notes.length && sampleIndex >= 0) {
    notes = [sampleIndex.toString()];
  }
  return { sound, notes, sampleIndex };
}

export function parseCode(code: string): TrackerSong {
  const children = extractStackChildren(code);
  const tracks: TrackerTrack[] = [];
  let maxNotes = 0;
  const parsed = children.map(c => {
    const p = parseTrack(c);
    maxNotes = Math.max(maxNotes, p.notes.length);
    return p;
  });
  const rows = Math.max(DEFAULT_PATTERN_ROWS, maxNotes);
  for (const p of parsed) {
    const cells: TrackerCell[] = [];
    const numNotes = p.notes.length;
    for (let i = 0; i < rows; i++) {
      const noteIdx = numNotes > 0 ? i % numNotes : -1;
      if (noteIdx >= 0) {
        cells.push(parseNoteToken(p.notes[noteIdx]));
      } else {
        cells.push({ note: null, octave: null, instrument: null, volume: null });
      }
    }
    tracks.push({
      name: p.sound,
      instrument: p.sound,
      sampleIndex: p.sampleIndex,
      cells,
    });
  }
  if (!tracks.length) {
    const cells: TrackerCell[] = [];
    for (let i = 0; i < rows; i++) {
      cells.push({ note: null, octave: null, instrument: null, volume: null });
    }
    tracks.push({ name: 'synth', instrument: 'synth', sampleIndex: 0, cells });
  }
  const pattern: TrackerPattern = {
    id: 'pat-0',
    name: 'Pattern 1',
    rows,
    tracks,
  };
  return {
    patterns: [pattern],
    sequence: [{ patternId: 'pat-0', patternName: 'Pattern 1', repeats: 1 }],
    bpm: 120,
  };
}

export function generateCode(song: TrackerSong): string {
  const pattern = song.patterns[0];
  if (!pattern) return '// no pattern';
  const trackCodes = pattern.tracks.map(track => {
    const noteValues = track.cells.map(c => generateNoteValue(c));
    const noteSeq = noteValues.join(' ');
    if (track.instrument === 'synth' || track.instrument === 'sawtooth' || track.instrument === 'superpiano') {
      return `  s("${track.instrument}").note("${noteSeq}")`;
    }
    return `  s("${track.instrument}").n("${noteSeq}")`;
  });
  if (trackCodes.length === 1) {
    return trackCodes[0].trim();
  }
  return `stack(\n${trackCodes.join(',\n')}\n)`;
}

export function trackerSongFromPatterns(currentCode: string): TrackerSong {
  try {
    return parseCode(currentCode);
  } catch {
    const song = parseCode('');
    return song;
  }
}
