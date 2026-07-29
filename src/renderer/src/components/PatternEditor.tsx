import { useRef, useEffect } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { defaultKeymap, indentWithTab, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching } from "@codemirror/language";
import { n4srTheme, n4srHighlight } from "../lib/n4sr-theme";
import { closeBracketsKeymap } from "@codemirror/autocomplete";

interface PatternEditorProps {
  content: string;
  onChange: (value: string) => void;
  onSave: (value: string) => void;
  onPlay: () => void;
}

export function PatternEditor({ content, onChange, onSave, onPlay }: PatternEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    });

    const customKeymap = keymap.of([
      {
        key: "Ctrl-Enter",
        run: () => {
          onPlay();
          return true;
        },
      },
      {
        key: "Ctrl-s",
        run: () => {
          onSave(viewRef.current?.state.doc.toString() || "");
          return true;
        },
      },
    ]);

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        n4srHighlight,
        javascript(),
        n4srTheme,
        keymap.of([...defaultKeymap, ...closeBracketsKeymap, ...historyKeymap, indentWithTab]),
        customKeymap,
        updateListener,
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": { fontFamily: "monospace", fontSize: "14px" },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []);

  useEffect(() => {
    if (viewRef.current) {
      const currentContent = viewRef.current.state.doc.toString();
      if (currentContent !== content) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentContent.length, insert: content },
        });
      }
    }
  }, [content]);

  return (
    <div className="pattern-editor">
      <div className="editor-toolbar">
        <span className="editor-title">Pattern Editor</span>
        <span className="editor-hint">Ctrl+Play | Ctrl+S to save</span>
      </div>
      <div ref={containerRef} className="editor-container" />
    </div>
  );
}
