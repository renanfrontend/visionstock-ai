"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const MAX_LINES = 160;
const TOKEN = /(<\/?[\w:.-]+|\/?>|<\?xml|\?>)|([\w:.-]+)(=)("[^"]*")/g;

/** Lightweight XML highlighter: tags, attribute names and values. Content is rendered as text, never as HTML. */
function highlightLine(line: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let inTag = false;
  for (const match of line.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(<span key={`t${last}`} className={inTag ? "text-ink-muted" : "text-ink"}>{line.slice(last, index)}</span>);
    if (match[1]) {
      const opening = match[1].startsWith("<");
      inTag = opening;
      parts.push(<span key={`g${index}`} className="text-ice">{match[1]}</span>);
    } else {
      parts.push(
        <span key={`a${index}`}>
          <span className="text-iris">{match[2]}</span>
          <span className="text-ink-faint">{match[3]}</span>
          <span className="text-mint">{match[4]}</span>
        </span>,
      );
    }
    last = index + match[0].length;
  }
  if (last < line.length) parts.push(<span key={`e${last}`} className="text-ink">{line.slice(last)}</span>);
  return parts;
}

export function XmlPreview({ xml, title }: { xml: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const lines = useMemo(() => xml.trimEnd().split("\n"), [xml]);
  const shown = lines.slice(0, MAX_LINES);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <figure className="max-w-full min-w-0 overflow-hidden rounded-xl border border-line bg-[#070915]">
      <figcaption className="flex items-center justify-between border-b border-line px-4 py-2 text-xs text-ink-muted">
        <span>{title}</span>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(xml).then(() => setCopied(true))}
          className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-white/5 hover:text-ink"
        >
          {copied ? <Check className="size-3.5 text-mint" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </figcaption>
      <pre className="max-h-[420px] overflow-auto py-3 font-mono text-[12px] leading-relaxed" tabIndex={0} aria-label={`Prévia: ${title}`}>
        <code>
          {shown.map((line, index) => (
            <div key={index} className="flex">
              <span className="w-10 shrink-0 pr-3 text-right text-ink-faint select-none" aria-hidden="true">
                {index + 1}
              </span>
              <span className="pr-4 whitespace-pre">{highlightLine(line)}</span>
            </div>
          ))}
          {lines.length > MAX_LINES ? <div className="pt-2 pl-10 text-ink-faint">… mais {lines.length - MAX_LINES} linhas no arquivo completo</div> : null}
        </code>
      </pre>
    </figure>
  );
}
