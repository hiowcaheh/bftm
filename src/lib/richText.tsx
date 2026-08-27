import { Fragment, type ReactNode } from 'react';

/**
 * Lekki formatter tekstu w stylu Discorda: **tekst** → pogrubienie.
 * Reszta bez zmian; łamania linii zachowuje `whitespace-pre-line` na kontenerze.
 * Świadomie minimalny (bez biblioteki markdown) — tylko bold.
 */
export function renderRichText(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const regex = /\*\*([\s\S]+?)\*\*/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
    parts.push(
      <strong key={key++} className="font-semibold text-text">
        {m[1]}
      </strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return parts;
}
