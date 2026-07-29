interface TransportProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onRender: () => void;
  isRendering: boolean;
  renderDuration: number;
  onRenderDurationChange: (dur: number) => void;
}

export function Transport({
  bpm,
  onBpmChange,
  isPlaying,
  onPlay,
  onStop,
  onRender,
  isRendering,
  renderDuration,
  onRenderDurationChange,
}: TransportProps) {
  return (
    <div className="transport">
      <div className="transport-controls">
        <button
          className={`transport-btn play ${isPlaying ? "active" : ""}`}
          onClick={isPlaying ? onStop : onPlay}
          title={isPlaying ? "Stop (Ctrl+.)" : "Play (Ctrl+Enter)"}
        >
          {isPlaying ? "⏹" : "▶"}
        </button>
      </div>

      <div className="transport-bpm">
        <label>BPM</label>
        <input
          type="number"
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
          min={20}
          max={300}
          className="bpm-input"
        />
      </div>

      <div className="transport-render">
        <label>Bars</label>
        <input
          type="number"
          value={renderDuration}
          onChange={(e) => onRenderDurationChange(Number(e.target.value))}
          min={1}
          max={128}
          className="bpm-input"
          title="Number of bars to render"
        />
        <button
          onClick={onRender}
          className="render-btn"
          disabled={isRendering}
          title="Render pattern to WAV file"
        >
          {isRendering ? "Rendering..." : "Render WAV"}
        </button>
      </div>
    </div>
  );
}
