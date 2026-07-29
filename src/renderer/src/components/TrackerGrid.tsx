import { useRef, useEffect, useCallback, useState } from 'react';
import { TrackerPattern, TrackerCell, noteToStr, Pos } from '../lib/trackerTypes';

interface TrackerGridProps {
  pattern: TrackerPattern;
  onChange: (pattern: TrackerPattern) => void;
  _onPlayPosition?: (row: number) => void;
}

export function TrackerGrid({ pattern, onChange }: TrackerGridProps) {
  const [cursor, setCursor] = useState<Pos>({ row: 0, track: 0 });
  const [editValue, setEditValue] = useState('');
  const [editing, setEditing] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gridRef.current) {
      const el = gridRef.current.querySelector(`[data-row="${cursor.row}"][data-track="${cursor.track}"]`) as HTMLElement;
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [cursor]);

  const updateCell = useCallback((pos: Pos, cell: TrackerCell) => {
    const tracks = pattern.tracks.map((t, ti) => {
      if (ti !== pos.track) return t;
      const cells = [...t.cells];
      cells[pos.row] = cell;
      return { ...t, cells };
    });
    onChange({ ...pattern, tracks });
  }, [pattern, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editing) {
      if (e.key === 'Enter') {
        finishEditing();
      } else if (e.key === 'Escape') {
        setEditing(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setCursor(p => ({ ...p, row: Math.max(0, p.row - 1) }));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setCursor(p => ({ ...p, row: Math.min(pattern.rows - 1, p.row + 1) }));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setCursor(p => ({ ...p, track: Math.max(0, p.track - 1) }));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setCursor(p => ({ ...p, track: Math.min(pattern.tracks.length - 1, p.track + 1) }));
        break;
      case 'Tab':
        e.preventDefault();
        setCursor(p => ({ ...p, track: (p.track + 1) % pattern.tracks.length }));
        break;
      case 'Home':
        e.preventDefault();
        setCursor(p => ({ ...p, row: 0 }));
        break;
      case 'End':
        e.preventDefault();
        setCursor(p => ({ ...p, row: pattern.rows - 1 }));
        break;
      case ' ': {
        e.preventDefault();
        const cell = pattern.tracks[cursor.track]?.cells[cursor.row];
        if (cell && cell.note) {
          updateCell(cursor, { note: null, octave: null, instrument: null, volume: null });
        } else {
          updateCell(cursor, { note: 'C-', octave: 4, instrument: null, volume: null });
        }
        break;
      }
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        updateCell(cursor, { note: null, octave: null, instrument: null, volume: null });
        break;
      default:
        if (e.key.length === 1 && /^[A-Ga-g]$/.test(e.key)) {
          startEditing(e.key.toUpperCase());
        }
    }
  }, [cursor, pattern, editing]);

  function startEditing(firstChar: string) {
    setEditValue(firstChar);
    setEditing(true);
  }

  function finishEditing() {
    setEditing(false);
    const val = editValue.trim().toUpperCase();
    if (val === '' || val === '--' || val === '---') {
      updateCell(cursor, { note: null, octave: null, instrument: null, volume: null });
    } else {
      const m = val.match(/^([A-G][#-]?)(\d)$/);
      if (m) {
        const raw = m[1].padEnd(2, '-') as any;
        const oct = parseInt(m[2]);
        updateCell(cursor, { note: raw, octave: oct, instrument: null, volume: null });
      }
    }
  }

  function handleCellClick(pos: Pos) {
    setCursor(pos);
    setEditing(false);
  }

  function handleCellDoubleClick(pos: Pos) {
    setCursor(pos);
    const cell = pattern.tracks[pos.track]?.cells[pos.row];
    if (cell?.note) {
      setEditValue(noteToStr(cell.note, cell.octave));
    } else {
      setEditValue('');
    }
    setEditing(true);
  }

  return (
    <div className="tracker-grid-wrapper" ref={gridRef} tabIndex={0} onKeyDown={handleKeyDown}>
      <table className="tracker-grid">
        <thead>
          <tr>
            <th className="tracker-row-header">#</th>
            {pattern.tracks.map((track, ti) => (
              <th key={ti} className="tracker-track-header">
                <div className="tracker-track-name">{track.name}</div>
                <div className="tracker-track-instr">{track.instrument}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pattern.tracks.length > 0 && pattern.tracks[0].cells.map((_, row) => (
            <tr key={row} className={row % 4 === 0 ? 'tracker-row-beat' : ''}>
              <td className="tracker-row-num">{String(row + 1).padStart(2, '0')}</td>
              {pattern.tracks.map((track, ti) => {
                const cell = track.cells[row];
                const isCursor = cursor.row === row && cursor.track === ti;
                return (
                  <td
                    key={ti}
                    data-row={row}
                    data-track={ti}
                    className={`tracker-cell${isCursor ? ' cursor' : ''}${cell?.note ? ' has-note' : ''}`}
                    onClick={() => handleCellClick({ row, track: ti })}
                    onDoubleClick={() => handleCellDoubleClick({ row, track: ti })}
                  >
                    {isCursor && editing ? (
                      <input
                        className="tracker-cell-edit"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value.toUpperCase())}
                        onBlur={finishEditing}
                        autoFocus
                      />
                    ) : (
                      <span>{cell ? noteToStr(cell.note, cell.octave) : '---'}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
