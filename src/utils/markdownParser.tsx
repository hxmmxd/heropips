import React from 'react';

// ── Markdown Parser Utilities ──────────────────────────────
export function parseMarkdown(text: string): React.ReactNode[] | null {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Table detection ──
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableRows: string[][] = [];
      let hasHeader = false;
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const row = lines[i].trim();
        // Skip separator rows like |---|---|
        if (/^\|[\s\-:]+\|/.test(row) && !row.replace(/[\s|\-:]/g, '')) {
          hasHeader = tableRows.length === 1;
          i++;
          continue;
        }
        const cells = row.split('|').slice(1, -1).map(c => c.trim());
        tableRows.push(cells);
        i++;
      }
      if (tableRows.length > 0) {
        const headerRow = hasHeader ? tableRows[0] : null;
        const bodyRows = hasHeader ? tableRows.slice(1) : tableRows;
        elements.push(
          <div key={`tbl-${i}`} style={{ overflowX: 'auto', margin: '12px 0', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              {headerRow && (
                <thead>
                  <tr>
                    {headerRow.map((cell, ci) => (
                      <th key={ci} style={{
                        padding: '8px 12px', textAlign: 'left', fontWeight: 800,
                        fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: 'var(--subtext)', borderBottom: '2px solid var(--border)',
                        background: 'var(--input-bg)',
                      }}>{parseInlineMarkdown(cell)}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : 'var(--input-bg)' }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{
                        padding: '7px 12px', borderBottom: '1px solid var(--border)',
                        color: 'var(--text)', fontFamily: /^[\d$+\-.,% ]+$/.test(cell.trim()) ? 'ui-monospace, monospace' : 'inherit',
                      }}>{parseInlineMarkdown(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // ── Horizontal rule ──
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(
        <div key={`hr-${i}`} style={{
          height: '1px', margin: '14px 0',
          background: 'linear-gradient(to right, transparent, var(--border), transparent)',
        }} />
      );
      i++;
      continue;
    }

    // ── ## Header ──
    if (trimmed.startsWith('## ') && !trimmed.startsWith('###')) {
      const headerText = trimmed.replace(/^##\s*/, '');
      elements.push(
        <h2 key={`h2-${i}`} style={{
          fontSize: '14px', fontWeight: 800, color: 'var(--text)',
          marginTop: '16px', marginBottom: '8px', paddingBottom: '6px',
          borderBottom: '1px solid var(--border)', letterSpacing: '-0.01em',
        }}>{parseInlineMarkdown(headerText)}</h2>
      );
      i++;
      continue;
    }

    // ── ### Header ──
    if (trimmed.startsWith('###')) {
      const headerText = trimmed.replace('###', '').trim();
      const hasRobot = headerText.includes('🤖') || headerText.toLowerCase().includes('agent');
      const cleanText = headerText.replace(/🤖/g, '').trim();
      elements.push(
        <h3 key={`h3-${i}`} className="text-[10px] font-bold text-[var(--subtext)] mt-4 mb-2.5 flex items-center gap-1.5 uppercase tracking-widest">
          {hasRobot && (
            <svg className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V9a2 2 0 00-2-2H7a2 2 0 00-2 2v8a2 2 0 002 2zM9 9h.01M15 9h.01M8 14h8" />
            </svg>
          )}
          <span>{cleanText}</span>
        </h3>
      );
      i++;
      continue;
    }

    // ── Blockquote ──
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      elements.push(
        <div key={`bq-${i}`} style={{
          borderLeft: '3px solid var(--accent)', paddingLeft: '14px',
          margin: '10px 0', padding: '10px 14px',
          background: 'color-mix(in srgb, var(--accent) 5%, transparent)',
          borderRadius: '0 10px 10px 0', fontSize: '12.5px',
          color: 'var(--text)', lineHeight: '1.6', fontStyle: 'italic',
        }}>
          {quoteLines.map((ql, qi) => <span key={qi}>{parseInlineMarkdown(ql)}{qi < quoteLines.length - 1 ? <br /> : null}</span>)}
        </div>
      );
      continue;
    }

    // ── Numbered list ──
    if (/^\d+\.\s/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s*/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} style={{ margin: '8px 0', paddingLeft: '0', listStyle: 'none', counterReset: 'md-counter' }}>
          {listItems.map((item, li) => (
            <li key={li} style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              fontSize: '12.5px', lineHeight: '1.6', color: 'var(--text)',
              marginBottom: '6px', opacity: 0.92,
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                color: 'var(--accent)', fontSize: '10px', fontWeight: 800, marginTop: '1px',
              }}>{li + 1}</span>
              <span>{formatBulletContent(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // ── Bullet list (- or *) ──
    if (/^[-*]\s/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*]\s*/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} style={{ margin: '8px 0', paddingLeft: '0', listStyle: 'none' }}>
          {listItems.map((item, li) => (
            <li key={li} style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              fontSize: '12.5px', lineHeight: '1.6', color: 'var(--text)',
              marginBottom: '5px', opacity: 0.92,
            }}>
              <span style={{
                width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0,
                background: 'var(--accent)', marginTop: '7px', opacity: 0.6,
              }} />
              <span>{formatBulletContent(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // ── Empty line ──
    if (trimmed === '') {
      elements.push(<div key={`sp-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    // ── Paragraph ──
    elements.push(
      <p key={`p-${i}`} style={{
        fontSize: '13px', lineHeight: '1.7', color: 'var(--text)',
        opacity: 0.92, margin: '6px 0',
      }}>{parseInlineMarkdown(trimmed)}</p>
    );
    i++;
  }

  return elements;
}

export function formatBulletContent(content: string): React.ReactNode {
  const colonIndex = content.indexOf(':');
  if (colonIndex !== -1 && colonIndex < 60) {
    const header = content.substring(0, colonIndex).trim();
    const body = content.substring(colonIndex + 1);
    const cleanHeader = header.replace(/\*\*|^\*|\*$/g, '').trim();
    return (
      <>
        <strong style={{ fontWeight: 700, color: 'var(--text)', marginRight: '4px' }}>{cleanHeader}:</strong>
        {parseInlineMarkdown(body)}
      </>
    );
  }
  return parseInlineMarkdown(content);
}

export function parseInlineMarkdown(text: string): React.ReactNode[] {
  // Clean up orphaned ** markers (e.g. "** Hammer" or "value **")
  let cleaned = text.replace(/\*\*\s+/g, '').replace(/\s+\*\*/g, '');
  // Also strip any remaining standalone ** that have no pair
  const starCount = (cleaned.match(/\*\*/g) || []).length;
  if (starCount % 2 !== 0) cleaned = cleaned.replace(/\*\*/, '');
  // Handle bold (**text**), italic (*text*), and inline code (`text`)
  const parts = cleaned.split(/(\*\*.*?\*\*|\*[^*]+?\*|`[^`]+?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} style={{ fontWeight: 700, color: 'var(--text)' }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return (
        <em key={idx} style={{ fontStyle: 'italic', opacity: 0.85 }}>
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} style={{
          fontFamily: 'ui-monospace, monospace', fontSize: '11.5px',
          background: 'var(--input-bg)', padding: '1px 5px', borderRadius: '4px',
          border: '1px solid var(--border)',
        }}>{part.slice(1, -1)}</code>
      );
    }
    return part;
  });
}
