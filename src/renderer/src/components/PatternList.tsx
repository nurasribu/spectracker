import { useState } from "react";
import { PatternNode } from "../lib/types";

interface PatternListProps {
  patterns: PatternNode[];
  currentPattern: string;
  onSelect: (path: string) => void;
  onNew: (name: string, folder: string) => void;
  onRefresh: () => void;
}

export function PatternList({
  patterns,
  currentPattern,
  onSelect,
  onNew,
  onRefresh,
}: PatternListProps) {
  const [newPatternName, setNewPatternName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("drums");
  const [showNewDialog, setShowNewDialog] = useState(false);

  const folders = patterns.filter((p) => p.is_dir);

  function handleCreate() {
    if (newPatternName.trim()) {
      onNew(newPatternName.trim(), selectedFolder);
      setNewPatternName("");
      setShowNewDialog(false);
    }
  }

  return (
    <div className="pattern-list">
      <div className="pattern-list-header">
        <span>Patterns</span>
        <div className="pattern-list-actions">
          <button onClick={onRefresh} className="icon-btn" title="Refresh">
            ↻
          </button>
          <button onClick={() => setShowNewDialog(true)} className="icon-btn" title="New Pattern">
            +
          </button>
        </div>
      </div>

      {showNewDialog && (
        <div className="new-pattern-dialog">
          <input
            type="text"
            placeholder="Pattern name"
            value={newPatternName}
            onChange={(e) => setNewPatternName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <select value={selectedFolder} onChange={(e) => setSelectedFolder(e.target.value)}>
            {folders.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </select>
          <div className="dialog-buttons">
            <button onClick={handleCreate}>Create</button>
            <button onClick={() => setShowNewDialog(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="pattern-tree">
        {folders.map((folder) => (
          <div key={folder.path} className="pattern-folder">
            <div className="folder-name">📁 {folder.name}</div>
            <div className="folder-children">
              {folder.children?.map((pattern) => (
                <div
                  key={pattern.path}
                  className={`pattern-item ${currentPattern === pattern.path ? "active" : ""}`}
                  onClick={() => onSelect(pattern.path)}
                >
                  🎵 {pattern.name.replace(".js", "")}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
