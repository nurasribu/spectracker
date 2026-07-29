import { useState, useEffect } from "react";
import { downloadDirtSamples } from "../lib/strudel";

export function SampleBrowser() {
  const [samples, setSamples] = useState<SampleInfo[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [downloading, setDownloading] = useState(false);
  const [downloadResult, setDownloadResult] = useState<string | null>(null);

  useEffect(() => {
    loadSamples();
  }, []);

  async function loadSamples() {
    try {
      const sampleList = await window.api.listSamples();
      const flat: SampleInfo[] = [];
      const cats: string[] = [];
      for (const cat of Object.keys(sampleList)) {
        const files: SampleInfo[] = sampleList[cat];
        cats.push(cat);
        for (const f of files) {
          flat.push({ name: f.name, path: f.path, category: cat });
        }
      }
      setSamples(flat);
      setCategories(cats);
    } catch (e) {
      console.error("Failed to load samples:", e);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setDownloadResult(null);
    try {
      const result = await downloadDirtSamples();
      if (result) {
        setDownloadResult(`Downloaded ${result.downloaded}/${result.total} samples (${result.errors} errors)`);
      }
      await loadSamples();
    } catch (e) {
      setDownloadResult(`Download failed: ${e}`);
    } finally {
      setDownloading(false);
    }
  }

  const filteredSamples =
    selectedCategory === "all"
      ? samples
      : samples.filter((s) => s.category === selectedCategory);

  return (
    <div className="sample-browser">
      <div className="sample-browser-header">
        <span>Samples ({samples.length} files)</span>
        <button
          className="download-btn"
          onClick={handleDownload}
          disabled={downloading}
          title="Download dirt-samples pack for offline use"
        >
          {downloading ? "Downloading..." : "Get dirt-samples"}
        </button>
      </div>

      {downloadResult && (
        <div className="download-result">{downloadResult}</div>
      )}

      {!samples.length && !downloading && (
        <div className="sample-hint">
          No local samples found. Put .wav files in
          ~/Projects/spectracker/samples/ or click "Get dirt-samples"
          to download the standard sample pack for offline use.
        </div>
      )}

      {categories.length > 0 && (
        <div className="sample-categories">
          <button
            className={selectedCategory === "all" ? "active" : ""}
            onClick={() => setSelectedCategory("all")}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={selectedCategory === cat ? "active" : ""}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="sample-list">
        {filteredSamples.map((sample) => (
          <div key={sample.path} className="sample-item" title={sample.path}>
            <span className="sample-name">{sample.name}</span>
          </div>
        ))}
      </div>

      <div className="sample-hint">
        Drag samples to editor or use <code>s("sample_name")</code>
      </div>
    </div>
  );
}
