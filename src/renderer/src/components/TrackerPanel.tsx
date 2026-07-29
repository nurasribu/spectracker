import { useState, useCallback, useRef, useEffect } from 'react';
import { TrackerSong, TrackerPattern } from '../lib/trackerTypes';
import { trackerSongFromPatterns, generateCode } from '../lib/trackerCodec';
import { TrackerGrid } from './TrackerGrid';
import { SongSequencer } from './SongSequencer';

interface TrackerPanelProps {
  currentCode: string;
  isOpen: boolean;
  onToggle: () => void;
  onCodeChange: (code: string) => void;
  height: number;
  onHeightChange: (h: number) => void;
}

type TabId = 'tracker' | 'sequencer';

export function TrackerPanel({
  currentCode,
  isOpen,
  onToggle,
  onCodeChange,
  height,
  onHeightChange,
}: TrackerPanelProps) {
  const [song, setSong] = useState<TrackerSong>(() => trackerSongFromPatterns(currentCode));
  const [currentPatternId, setCurrentPatternId] = useState(song.patterns[0]?.id || '');
  const [tab, setTab] = useState<TabId>('tracker');
  const [dirty, setDirty] = useState(false);
  const resizeRef = useRef<{ startY: number; startH: number } | null>(null);

  useEffect(() => {
    if (!dirty) {
      setSong(trackerSongFromPatterns(currentCode));
    }
  }, [currentCode]);

  const currentPattern = song.patterns.find(p => p.id === currentPatternId) || song.patterns[0];

  const handlePatternChange = useCallback((pat: TrackerPattern) => {
    setSong(prev => {
      const patterns = prev.patterns.map(p => p.id === pat.id ? pat : p);
      return { ...prev, patterns };
    });
    setDirty(true);
  }, []);

  const handleSequenceChange = useCallback((sequence: typeof song.sequence) => {
    setSong(prev => ({ ...prev, sequence }));
  }, []);

  const handleGenerate = useCallback(() => {
    const code = generateCode(song);
    onCodeChange(code);
    setDirty(false);
  }, [song, onCodeChange]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current = { startY: e.clientY, startH: height };
    const handleMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startY - ev.clientY;
      onHeightChange(Math.max(100, Math.min(800, resizeRef.current.startH + delta)));
    };
    const handleUp = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [height, onHeightChange]);

  return (
    <div className="tracker-panel" style={{ height: isOpen ? height : 0 }}>
      <div className="tracker-panel-resize-handle" onMouseDown={handleResizeStart} />
      <div className="tracker-panel-header">
        <div className="tracker-panel-tabs">
          <button
            className={`tracker-tab ${tab === 'tracker' ? 'active' : ''}`}
            onClick={() => setTab('tracker')}
          >
            Grid
          </button>
          <button
            className={`tracker-tab ${tab === 'sequencer' ? 'active' : ''}`}
            onClick={() => setTab('sequencer')}
          >
            Song
          </button>
        </div>
        <div className="tracker-panel-actions">
          <button className="tracker-action-btn" onClick={handleGenerate} title="Generate Strudel code from grid">
            Generate Code
          </button>
          {dirty && <span className="tracker-dirty-badge">unsaved</span>}
          <button className="tracker-close-btn" onClick={onToggle} title="Close panel">×</button>
        </div>
      </div>
      {tab === 'tracker' && currentPattern && (
        <div className="tracker-grid-container">
          <TrackerGrid
            key={currentPattern.id}
            pattern={currentPattern}
            onChange={handlePatternChange}
          />
        </div>
      )}
      {tab === 'sequencer' && (
        <div className="tracker-sequencer-container">
          <SongSequencer
            song={song}
            onSelectPattern={setCurrentPatternId}
            onSequenceChange={handleSequenceChange}
          />
        </div>
      )}
    </div>
  );
}
