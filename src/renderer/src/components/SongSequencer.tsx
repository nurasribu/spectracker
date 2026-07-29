import { useCallback } from 'react';
import { TrackerSong, SongSlot } from '../lib/trackerTypes';

interface SongSequencerProps {
  song: TrackerSong;
  onSelectPattern: (patternId: string) => void;
  onSequenceChange: (sequence: SongSlot[]) => void;
}

export function SongSequencer({ song, onSelectPattern, onSequenceChange }: SongSequencerProps) {
  const addSlot = useCallback(() => {
    const firstId = song.patterns[0]?.id;
    if (!firstId) return;
    const newSlot: SongSlot = {
      patternId: firstId,
      patternName: song.patterns[0].name,
      repeats: 1,
    };
    onSequenceChange([...song.sequence, newSlot]);
  }, [song, onSequenceChange]);

  const removeSlot = useCallback((idx: number) => {
    const seq = song.sequence.filter((_, i) => i !== idx);
    onSequenceChange(seq);
  }, [song.sequence, onSequenceChange]);

  const changeSlot = useCallback((idx: number, patternId: string) => {
    const seq = song.sequence.map((slot, i) => {
      if (i !== idx) return slot;
      const pat = song.patterns.find(p => p.id === patternId);
      return { ...slot, patternId, patternName: pat?.name || slot.patternName };
    });
    onSequenceChange(seq);
  }, [song.sequence, song.patterns, onSequenceChange]);

  return (
    <div className="song-sequencer">
      <div className="sequencer-toolbar">
        <span className="sequencer-title">Song Sequence</span>
        <button className="icon-btn" onClick={addSlot} title="Add pattern slot">+</button>
      </div>
      <div className="sequencer-list">
        {song.sequence.map((slot, idx) => (
          <div key={idx} className="sequencer-slot">
            <span className="slot-index">{String(idx + 1).padStart(2, '0')}</span>
            <select
              className="slot-pattern-select"
              value={slot.patternId}
              onChange={e => changeSlot(idx, e.target.value)}
            >
              {song.patterns.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <span className="slot-repeats">{slot.repeats}x</span>
            <button
              className="slot-play-btn"
              onClick={() => onSelectPattern(slot.patternId)}
              title="Edit this pattern"
            >
              ▶
            </button>
            <button
              className="slot-remove-btn"
              onClick={() => removeSlot(idx)}
              title="Remove slot"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
