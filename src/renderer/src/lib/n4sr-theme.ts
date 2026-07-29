import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

const n4srColors = {
  bg: "#1a0003",
  bgDark: "#120002",
  bgMid: "#3a0008",
  bgLight: "#600812",
  red: "#7a0000",
  redBright: "#cc0403",
  text: "#edf6d6",
  yellow: "#f7f0c0",
  gold: "#d4c47a",
  goldLight: "#e8d48b",
  blue: "#4fc3f7",
  comment: "#7a5a3a",
  selection: "#3d6b8e",
};

export const n4srTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: n4srColors.bg,
      color: n4srColors.text,
    },
    ".cm-content": {
      caretColor: n4srColors.gold,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: n4srColors.gold,
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: n4srColors.selection,
      },
    ".cm-panels": {
      backgroundColor: n4srColors.bgDark,
      color: n4srColors.text,
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: `1px solid ${n4srColors.bgMid}`,
    },
    ".cm-panels.cm-panels-bottom": {
      borderTop: `1px solid ${n4srColors.bgMid}`,
    },
    ".cm-searchMatch": {
      backgroundColor: n4srColors.gold,
      outline: `1px solid ${n4srColors.goldLight}`,
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: n4srColors.selection,
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(58, 0, 8, 0.3)",
    },
    ".cm-selectionMatch": {
      backgroundColor: "rgba(61, 107, 142, 0.3)",
    },
    "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
      backgroundColor: "rgba(212, 196, 122, 0.2)",
    },
    ".cm-gutters": {
      backgroundColor: n4srColors.bgDark,
      color: n4srColors.comment,
      borderRight: `1px solid ${n4srColors.bgMid}`,
    },
    ".cm-activeLineGutter": {
      backgroundColor: n4srColors.bgMid,
      color: n4srColors.gold,
    },
    ".cm-foldPlaceholder": {
      backgroundColor: n4srColors.bgLight,
      border: "none",
      color: n4srColors.gold,
    },
    ".cm-tooltip": {
      border: `1px solid ${n4srColors.bgMid}`,
      backgroundColor: n4srColors.bgDark,
    },
    ".cm-tooltip .cm-tooltip-arrow:before": {
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
    },
    ".cm-tooltip .cm-tooltip-arrow:after": {
      borderTopColor: n4srColors.bgDark,
      borderBottomColor: n4srColors.bgDark,
    },
    ".cm-tooltip-autocomplete": {
      "& > ul > li[aria-selected]": {
        backgroundColor: n4srColors.bgMid,
        color: n4srColors.text,
      },
    },
  },
  { dark: true }
);

const n4srHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: n4srColors.redBright },
  { tag: [tags.name, tags.deleted, tags.character, tags.macroName], color: n4srColors.text },
  { tag: [tags.function(tags.variableName)], color: n4srColors.gold },
  { tag: [tags.labelName], color: n4srColors.goldLight },
  { tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: n4srColors.yellow },
  { tag: [tags.definition(tags.name), tags.separator], color: n4srColors.text },
  { tag: [tags.typeName, tags.className, tags.number, tags.changed, tags.annotation, tags.modifier, tags.self, tags.namespace], color: n4srColors.yellow },
  { tag: [tags.operator, tags.operatorKeyword, tags.url, tags.escape, tags.regexp, tags.link, tags.special(tags.string)], color: n4srColors.blue },
  { tag: [tags.meta, tags.comment], color: n4srColors.comment, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold", color: n4srColors.yellow },
  { tag: tags.emphasis, fontStyle: "italic", color: n4srColors.goldLight },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.link, color: n4srColors.blue, textDecoration: "underline" },
  { tag: tags.heading, fontWeight: "bold", color: n4srColors.gold },
  { tag: [tags.atom, tags.bool, tags.special(tags.variableName)], color: n4srColors.yellow },
  { tag: [tags.processingInstruction, tags.string, tags.inserted], color: n4srColors.goldLight },
  { tag: tags.invalid, color: n4srColors.redBright },
]);

export const n4srHighlight = syntaxHighlighting(n4srHighlightStyle);
