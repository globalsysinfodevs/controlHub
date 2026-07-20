import { Fragment } from "react";

/**
 * Minimal, dependency-free markdown renderer for assistant output.
 * Supports headings, bold, italics, inline code, fenced code, lists,
 * horizontal rules, and paragraphs — enough for grounded agent replies.
 */
function inline(text: string, keyBase: string) {
  // Split on inline code first, then bold, then italics.
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={`${keyBase}-c${i}`} className="rounded bg-ink/[0.08] px-1.5 py-0.5 font-mono text-[0.85em] text-telemetry-600">
          {part.slice(1, -1)}
        </code>
      );
    }
    const withBold = part.split(/(\*\*[^*]+\*\*)/g).map((seg, j) => {
      if (seg.startsWith("**") && seg.endsWith("**")) {
        return (
          <strong key={`${keyBase}-b${i}-${j}`} className="font-semibold text-ink">
            {seg.slice(2, -2)}
          </strong>
        );
      }
      const withItalic = seg.split(/(_[^_]+_)/g).map((s, k) =>
        s.startsWith("_") && s.endsWith("_") ? (
          <em key={`${keyBase}-i${i}-${j}-${k}`} className="text-ink-muted">
            {s.slice(1, -1)}
          </em>
        ) : (
          <Fragment key={`${keyBase}-t${i}-${j}-${k}`}>{s}</Fragment>
        )
      );
      return <Fragment key={`${keyBase}-s${i}-${j}`}>{withItalic}</Fragment>;
    });
    return <Fragment key={`${keyBase}-p${i}`}>{withBold}</Fragment>;
  });
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: JSX.Element[] = [];
  let list: string[] = [];
  let ordered = false;
  let code: string[] | null = null;

  const flushList = (key: string) => {
    if (!list.length) return;
    const Tag = ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={key} className={ordered ? "ml-4 list-decimal space-y-1" : "ml-1 space-y-1"}>
        {list.map((li, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-muted">
            {!ordered && <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-400" />}
            <span>{inline(li, `li-${key}-${i}`)}</span>
          </li>
        ))}
      </Tag>
    );
    list = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.replace(/\s+$/, "");
    if (line.startsWith("```")) {
      if (code) {
        blocks.push(
          <pre key={`code-${idx}`} className="overflow-x-auto rounded-lg border border-line bg-base/60 p-3 font-mono text-xs text-ink-muted">
            {code.join("\n")}
          </pre>
        );
        code = null;
      } else {
        flushList(`l-${idx}`);
        code = [];
      }
      return;
    }
    if (code) {
      code.push(raw);
      return;
    }
    if (/^#{1,3}\s/.test(line)) {
      flushList(`l-${idx}`);
      const level = line.match(/^#+/)![0].length;
      const content = line.replace(/^#+\s/, "");
      const cls = level === 1 ? "text-base font-semibold" : "text-sm font-semibold";
      blocks.push(
        <p key={`h-${idx}`} className={`font-display ${cls} text-ink`}>
          {inline(content, `h-${idx}`)}
        </p>
      );
      return;
    }
    if (/^[-*]\s/.test(line)) {
      ordered = false;
      list.push(line.replace(/^[-*]\s/, ""));
      return;
    }
    if (/^\d+\.\s/.test(line)) {
      ordered = true;
      list.push(line.replace(/^\d+\.\s/, ""));
      return;
    }
    if (line === "---") {
      flushList(`l-${idx}`);
      blocks.push(<hr key={`hr-${idx}`} className="border-line" />);
      return;
    }
    flushList(`l-${idx}`);
    if (line.trim() === "") return;
    blocks.push(
      <p key={`p-${idx}`} className="text-sm leading-relaxed text-ink-muted">
        {inline(line, `p-${idx}`)}
      </p>
    );
  });
  flushList("l-end");

  return <div className="space-y-2.5">{blocks}</div>;
}
