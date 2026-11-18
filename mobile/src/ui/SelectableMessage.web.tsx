import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { phraseRange, type PhraseRange } from "../core/selection";
import type { TextAccentRange } from "../core/grammarAccent";
import type { SelectableMessageProps } from "./SelectableMessage";
import { c, fonts } from "./components";

type Highlight = PhraseRange & { top: number; left: number };

function highlightedText(text: string, ranges: TextAccentRange[]) {
  const content: React.ReactNode[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) content.push(text.slice(cursor, range.start));
    content.push(
      <span
        key={`${range.start}-${range.end}`}
        style={{ color: c.grammar, fontWeight: 600 }}
      >
        {text.slice(range.start, range.end)}
      </span>,
    );
    cursor = range.end;
  }
  if (cursor < text.length) content.push(text.slice(cursor));
  return content;
}

export function SelectableMessage({
  message,
  enabled,
  compact = false,
  accentRanges = [],
  onSelect,
}: SelectableMessageProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);

  useEffect(() => {
    function readSelection() {
      const root = textRef.current;
      const selected = window.getSelection();
      if (
        !enabled ||
        !message.final ||
        !root ||
        !selected ||
        selected.isCollapsed ||
        selected.rangeCount !== 1
      ) {
        setHighlight(null);
        return;
      }
      const range = selected.getRangeAt(0);
      if (
        !root.contains(range.startContainer) ||
        !root.contains(range.endContainer)
      ) {
        setHighlight(null);
        return;
      }
      const prefix = range.cloneRange();
      prefix.selectNodeContents(root);
      prefix.setEnd(range.startContainer, range.startOffset);
      const start = prefix.toString().length;
      const text = range.toString();
      const offsets = phraseRange(message, {
        start,
        end: start + text.length,
        text,
        sourceText: root.textContent ?? "",
      });
      if (!offsets) {
        setHighlight(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setHighlight({
        ...offsets,
        top: rect.top >= 56 ? rect.top - 50 : rect.bottom + 8,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 152)),
      });
    }
    readSelection();
    document.addEventListener("selectionchange", readSelection);
    window.addEventListener("resize", readSelection);
    window.addEventListener("scroll", readSelection, true);
    return () => {
      document.removeEventListener("selectionchange", readSelection);
      window.removeEventListener("resize", readSelection);
      window.removeEventListener("scroll", readSelection, true);
    };
  }, [enabled, message]);

  return (
    <>
      <div
        ref={textRef}
        style={{
          color: c.ink,
          fontFamily: message.role === "assistant" ? fonts.serif : fonts.sans,
          fontSize: compact
            ? message.role === "assistant"
              ? 16
              : 15
            : message.role === "assistant"
              ? 18
              : 17,
          lineHeight: compact
            ? message.role === "assistant"
              ? "25px"
              : "23px"
            : message.role === "assistant"
              ? "28px"
              : "25px",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          userSelect: "text",
          WebkitUserSelect: "text",
          cursor: "text",
        }}
      >
        {highlightedText(message.text, accentRanges)}
      </div>
      {highlight &&
        enabled &&
        createPortal(
          <button
            type="button"
            aria-label="Save highlighted phrase"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              onSelect({ start: highlight.start, end: highlight.end });
              window.getSelection()?.removeAllRanges();
              setHighlight(null);
            }}
            style={{
              position: "fixed",
              top: highlight.top,
              left: highlight.left,
              zIndex: 1000,
              border: `1px solid ${c.ink}`,
              borderRadius: 12,
              background: c.ink,
              color: c.paper,
              padding: "11px 16px",
              minHeight: 44,
              font: "600 14px -apple-system, BlinkMacSystemFont, sans-serif",
              boxShadow: `0 4px 16px ${c.shadow}30`,
              cursor: "pointer",
            }}
          >
            Save phrase
          </button>,
          document.body,
        )}
    </>
  );
}
