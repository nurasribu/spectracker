import { useState, useEffect } from "react";
import { PatternEditor } from "./components/PatternEditor";
import { PatternList } from "./components/PatternList";
import { Transport } from "./components/Transport";
import { SampleBrowser } from "./components/SampleBrowser";
import { playPattern, stopPattern, renderToWav, init } from "./lib/strudel";
import { PatternNode } from "./lib/types";

function App() {
  const [projectPath, setProjectPath] = useState<string>("");
  const [patterns, setPatterns] = useState<PatternNode[]>([]);
  const [currentPattern, setCurrentPattern] = useState<string>("");
  const [patternContent, setPatternContent] = useState<string>(
    `// Write your Strudel pattern here
s("sawtooth").note("c4 e4 g4 c5").gain(".5 .4 .3 .6")
`
  );
  const [bpm, setBpm] = useState<number>(120);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"patterns" | "samples">("patterns");
  const [renderDuration, setRenderDuration] = useState<number>(16);

  useEffect(() => {
    loadDefaultProject();
    init().catch(console.error);
  }, []);

  async function loadDefaultProject() {
    try {
      const homeDir = await window.api.getHomeDir();
      const defaultPath = `${homeDir}/Projects/strudel-tracker/patterns`;
      setProjectPath(defaultPath);
      await refreshPatterns(defaultPath);
    } catch (e) {
      console.error("Failed to load project:", e);
    }
  }

  async function refreshPatterns(path: string) {
    try {
      const nodes = await window.api.listPatterns(path);
      const mapped: PatternNode[] = nodes.map((n) => ({
        name: n.name,
        path: n.path,
        is_dir: n.type === "folder",
        children: n.children?.map((c) => ({
          name: c.name,
          path: c.path,
          is_dir: c.type === "folder",
        })),
      }));
      setPatterns(mapped);
    } catch (e) {
      console.error("Failed to list patterns:", e);
    }
  }

  async function handlePatternSelect(path: string) {
    try {
      const content = await window.api.readPattern(path);
      setPatternContent(content);
      setCurrentPattern(path);
    } catch (e) {
      console.error("Failed to read pattern:", e);
    }
  }

  async function handlePatternSave(content: string) {
    if (!currentPattern) return;
    try {
      await window.api.savePattern(currentPattern, content);
    } catch (e) {
      console.error("Failed to save pattern:", e);
    }
  }

  async function handlePlay() {
    try {
      await playPattern(patternContent);
      setIsPlaying(true);
    } catch (e) {
      console.error("Play failed:", e);
    }
  }

  function handleStop() {
    stopPattern();
    setIsPlaying(false);
  }

  async function handleNewPattern(name: string, folder: string) {
    const path = `${projectPath}/${folder}/${name}.js`;
    const template = `// ${name}\ns("bd sd hh cp")\n`;
    try {
      await window.api.savePattern(path, template);
      await refreshPatterns(projectPath);
      await handlePatternSelect(path);
    } catch (e) {
      console.error("Failed to create pattern:", e);
    }
  }

  async function handleRender() {
    setIsRendering(true);
    try {
      const wavBuffer = await renderToWav(patternContent, bpm, renderDuration);
      const blob = new Blob([wavBuffer], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = currentPattern
        ? currentPattern.split("/").pop()?.replace(".js", ".wav") || "output.wav"
        : "output.wav";
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to render:", e);
      alert(`Render failed: ${e}`);
    } finally {
      setIsRendering(false);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Strudel Tracker</h1>
        <Transport
          bpm={bpm}
          onBpmChange={setBpm}
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onStop={handleStop}
          onRender={handleRender}
          isRendering={isRendering}
          renderDuration={renderDuration}
          onRenderDurationChange={setRenderDuration}
        />
      </header>

      <div className="main">
        <aside className="sidebar">
          <div className="tabs">
            <button
              className={activeTab === "patterns" ? "active" : ""}
              onClick={() => setActiveTab("patterns")}
            >
              Patterns
            </button>
            <button
              className={activeTab === "samples" ? "active" : ""}
              onClick={() => setActiveTab("samples")}
            >
              Samples
            </button>
          </div>

          {activeTab === "patterns" ? (
            <PatternList
              patterns={patterns}
              currentPattern={currentPattern}
              onSelect={handlePatternSelect}
              onNew={handleNewPattern}
              onRefresh={() => refreshPatterns(projectPath)}
            />
          ) : (
            <SampleBrowser />
          )}
        </aside>

        <main className="editor-area">
          <PatternEditor
            content={patternContent}
            onChange={setPatternContent}
            onSave={handlePatternSave}
            onPlay={() => playPattern(patternContent)}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
