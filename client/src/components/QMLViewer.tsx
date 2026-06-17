import React, { useMemo } from 'react';
import { IconCode, IconEye } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';

// ---------- Minimal QML tokenizer + parser ----------

interface QMLElement {
  type: string;
  props: Record<string, string>;
  children: QMLElement[];
}

function tokenize(src: string) {
  const tokens: { t: string; v: string }[] = [];
  let i = 0;
  while (i < src.length) {
    if (src[i] === '/' && src[i + 1] === '/') {
      let end = src.indexOf('\n', i);
      if (end === -1) end = src.length;
      i = end;
      continue;
    }
    if (src[i] === '/' && src[i + 1] === '*') {
      let end = src.indexOf('*/', i + 2);
      if (end === -1) end = src.length - 2;
      i = end + 2;
      continue;
    }
    if (src[i] === '"' || src[i] === "'") {
      const quote = src[i];
      let j = i + 1;
      while (j < src.length && src[j] !== quote) {
        if (src[j] === '\\') j++;
        j++;
      }
      tokens.push({ t: 'string', v: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    if (/\s/.test(src[i])) { i++; continue; }
    if (/[a-zA-Z_]/.test(src[i])) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_.]/.test(src[j])) j++;
      tokens.push({ t: 'id', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/[0-9]/.test(src[i])) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      tokens.push({ t: 'num', v: src.slice(i, j) });
      i = j;
      continue;
    }
    tokens.push({ t: src[i], v: src[i] });
    i++;
  }
  return tokens;
}

function parseElement(tokens: { t: string; v: string }[], pos: number): [QMLElement, number] {
  const type = tokens[pos].v;
  pos++; // skip type name
  const el: QMLElement = { type, props: {}, children: [] };

  if (tokens[pos]?.t === '{') {
    pos++; // skip {
    while (pos < tokens.length && tokens[pos].t !== '}') {
      if (tokens[pos].t === 'id' && tokens[pos + 1]?.t === ':') {
        const key = tokens[pos].v;
        pos += 2; // skip key and :
        const [val, nextPos] = parseValue(tokens, pos);
        el.props[key] = val;
        pos = nextPos;
      } else if (tokens[pos].t === 'id' && tokens[pos + 1]?.t === '{') {
        // child element
        const [child, nextPos] = parseElement(tokens, pos);
        el.children.push(child);
        pos = nextPos;
      } else {
        pos++;
      }
    }
    if (tokens[pos]?.t === '}') pos++; // skip }
  }

  return [el, pos];
}

function parseValue(tokens: { t: string; v: string }[], pos: number): [string, number] {
  const t = tokens[pos];
  if (!t) return ['', pos];
  if (t.t === 'string') return [t.v, pos + 1];
  if (t.t === 'num') return [t.v, pos + 1];
  if (t.t === 'id' && (t.v === 'true' || t.v === 'false' || t.v === 'Qt' || t.v.startsWith('#'))) {
    if (t.v === 'true') return ['true', pos + 1];
    if (t.v === 'false') return ['false', pos + 1];
    if (t.v === 'Qt') {
      // Skip Qt.lightness(x) etc — approximate
      let j = pos + 1;
      while (j < tokens.length && tokens[j].t !== ';' && tokens[j].t !== ',' && tokens[j].t !== ')' && tokens[j].t !== '}') j++;
      return ['#26de81', j];
    }
    if (t.v.startsWith('#')) return [t.v, pos + 1];
  }
  // fallback: collect until ; , or }
  let j = pos;
  while (j < tokens.length && tokens[j].t !== ';' && tokens[j].t !== ',' && tokens[j].t !== ')' && tokens[j].t !== '}') j++;
  return [tokens.slice(pos, j).map(x => x.v).join(' '), j];
}

function parseQML(qml: string): QMLElement[] {
  const tokens = tokenize(qml);
  const elements: QMLElement[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i].t === 'id' && tokens[i + 1]?.t === '{') {
      const [el, next] = parseElement(tokens, i);
      elements.push(el);
      i = next;
    } else {
      i++;
    }
  }
  return elements;
}

// ---------- QML → React renderer ----------

function parseColor(val: string): string {
  if (!val) return 'transparent';
  const s = val.trim();
  if (s.startsWith('#')) return s;
  const named: Record<string, string> = {
    black: '#000', white: '#fff', red: '#ff4b4b', green: '#26de81',
    blue: '#3b82f6', gray: '#7a7870', transparent: 'transparent',
    darkgray: '#2a2f3a', lightgray: '#7a8799',
  };
  return named[s.toLowerCase()] || `color-mix(in srgb, var(--text-primary), ${s})`;
}

function parsePx(val: string): number | null {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

interface RenderCtx {
  bg: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
}

function renderElement(el: QMLElement, index: number, ctx: RenderCtx): React.ReactNode {
  const p = el.props;
  const style: Record<string, string> = {
    boxSizing: 'border-box',
    position: 'relative',
  };
  const w = parsePx(p['width']); if (w !== null) style['width'] = `${w}px`;
  const h = parsePx(p['height']); if (h !== null) style['height'] = `${h}px`;
  const x = parsePx(p['x']); if (x !== null) style['marginLeft'] = `${x}px`;
  const y = parsePx(p['y']); if (y !== null) style['marginTop'] = `${y}px`;
  const r = parsePx(p['radius']); if (r !== null) style['borderRadius'] = `${r}px`;
  const sp = parsePx(p['spacing']); if (sp !== null) style['gap'] = `${sp}px`;
  const bdr = parsePx(p['border.width']); if (bdr !== null) style['borderWidth'] = `${bdr}px`;
  if (p['border.color']) style['borderColor'] = parseColor(p['border.color']);
  if (bdr !== null || p['border.color']) style['borderStyle'] = 'solid';
  if (p['visible'] === 'false') style['visibility'] = 'hidden';
  if (p['opacity']) style['opacity'] = p['opacity'];

  const children = el.children.map((c, i) => renderElement(c, i, ctx));

  const sharedContainer = (content: React.ReactNode, extraStyle: Record<string, string> = {}): React.ReactNode => (
    <div key={index} style={{ ...style, ...extraStyle }}>{content}</div>
  );

  switch (el.type) {
    case 'ApplicationWindow': {
      const title = p['title'] || 'QML Window';
      const wVal = p['width'] ? (parsePx(p['width']) ?? 480) : 480;
      const hVal = p['height'] ? (parsePx(p['height']) ?? 320) : 320;
      return (
        <div key={index} style={{
          ...style, width: Math.min(wVal, 100) + '%', maxWidth: `${wVal}px`,
          height: `${hVal}px`, maxHeight: '100%',
          background: parseColor(p['color'] || p['background'] || ctx.bg),
          display: 'flex', flexDirection: 'column',
          borderRadius: '8px', overflow: 'hidden',
          border: '1px solid var(--border-color)', margin: '0 auto',
        }}>
          <div style={{
            padding: '6px 12px', background: 'rgba(255,255,255,0.05)',
            fontFamily: 'var(--font-family-mono)', fontSize: '0.75rem',
            color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)',
          }}>{title}</div>
          <div style={{
            flex: 1, padding: '10px', display: 'flex', flexDirection: 'column',
            gap: '8px', position: 'relative', overflow: 'auto',
          }}>{children}</div>
        </div>
      );
    }

    case 'Rectangle':
      return (
        <div key={index} style={{
          ...style, background: parseColor(p['color']),
          borderRadius: style['borderRadius'] || '0',
          border: style['borderWidth'] ? `${style['borderWidth']} solid ${style['borderColor'] || 'var(--border-color)'}` : undefined,
        }}>{children}</div>
      );

    case 'Text': {
      const fam = p['font.family'] ? `'${p['font.family']}', ${ctx.fontFamily}` : ctx.fontFamily;
      const fSize = parsePx(p['font.pixelSize']) || ctx.fontSize;
      const fw = p['font.bold'] === 'true' ? 'bold' : ctx.fontWeight;
      const color = p['font.color'] ? parseColor(p['font.color']) : p['color'] ? parseColor(p['color']) : ctx.textColor;
      let align: 'left' | 'center' | 'right' = 'left';
      if (p['horizontalAlignment']?.toLowerCase().includes('center')) align = 'center';
      if (p['horizontalAlignment']?.toLowerCase().includes('right')) align = 'right';
      return (
        <div key={index} style={{
          ...style, fontFamily: fam, fontSize: `${fSize}px`,
          fontWeight: fw, color, textAlign: align,
          padding: p['padding'] ? `${parsePx(p['padding'])}px` : '2px 0',
        }}>{p['text'] || children}</div>
      );
    }

    case 'Button':
    case 'RoundButton':
      return (
        <button key={index} style={{
          ...style, cursor: 'pointer',
          border: '1px solid var(--border-color)', borderRadius: r !== null ? `${r}px` : '4px',
          padding: '8px 16px',
          background: p['highlighted'] === 'true' ? 'var(--accent-sym)' : 'var(--bg-mist)',
          color: p['highlighted'] === 'true' ? '#000' : 'var(--text-primary)',
          fontFamily: 'var(--font-family-heading)', fontWeight: 700,
          fontSize: '0.82rem', letterSpacing: '0.5px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          whiteSpace: 'nowrap',
        }}>
          {p['text'] || children}
        </button>
      );

    case 'TextField':
    case 'TextInput':
      return (
        <input key={index} readOnly style={{
          ...style, background: 'rgba(0,0,0,0.3)',
          border: '1px solid var(--border-color)', borderRadius: '4px',
          padding: '6px 10px', color: 'var(--text-primary)',
          fontFamily: 'var(--font-family-body)', fontSize: '0.85rem',
          width: w !== null ? `${w}px` : '200px',
        }} placeholder={p['placeholderText'] || ''} defaultValue={p['text'] || ''} />
      );

    case 'TextArea':
      return (
        <textarea key={index} readOnly style={{
          ...style, background: 'rgba(0,0,0,0.3)',
          border: '1px solid var(--border-color)', borderRadius: '4px',
          padding: '6px 10px', color: 'var(--text-primary)',
          fontFamily: 'var(--font-family-body)', fontSize: '0.85rem', resize: 'none',
        }} placeholder={p['placeholderText'] || ''} defaultValue={p['text'] || ''} rows={4} />
      );

    case 'Image':
    case 'AnimatedImage':
      return (
        <div key={index} style={{
          ...style, background: parseColor(p['fill'] || p['color']) || 'rgba(255,255,255,0.03)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', color: 'var(--text-secondary)', overflow: 'hidden',
          minHeight: h !== null ? undefined : '80px',
        }}>
          {p['source'] ? (
            p['source'].match(/\.(png|jpg|jpeg|gif|svg|webp)$/i) ? (
              <img src={p['source']} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: p['fillMode'] === 'stretch' ? 'fill' as const : 'contain' as const }} />
            ) : (
              <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', wordBreak: 'break-all', padding: '4px' }}>{p['source']}</span>
            )
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          )}
        </div>
      );

    case 'ColumnLayout':
      return (
        <div key={index} style={{
          ...style, display: 'flex', flexDirection: 'column',
          gap: style['gap'] || '8px', flex: 1, alignItems: p['Layout.alignment']?.toLowerCase().includes('center') ? 'center' as const : 'stretch' as const,
        }}>{children}</div>
      );

    case 'RowLayout':
      return (
        <div key={index} style={{
          ...style, display: 'flex', flexDirection: 'row',
          gap: style['gap'] || '8px', alignItems: 'center',
          flexWrap: 'wrap',
        }}>{children}</div>
      );

    case 'GridLayout': {
      const cols = parseInt(p['columns']) || 2;
      return (
        <div key={index} style={{
          ...style, display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: style['gap'] || '8px',
        }}>{children}</div>
      );
    }

    case 'CheckBox':
    case 'CheckDelegate':
      return (
        <label key={index} style={{
          ...style, display: 'inline-flex', alignItems: 'center', gap: '6px',
          cursor: 'pointer', fontFamily: 'var(--font-family-body)', fontSize: '0.85rem',
          color: 'var(--text-primary)',
        }}>
          <input type="checkbox" defaultChecked={p['checked'] === 'true'} readOnly
            style={{ accentColor: 'var(--accent-sym)', margin: 0 }} />
          {p['text'] || children}
        </label>
      );

    case 'Switch':
      return (
        <label key={index} style={{
          ...style, display: 'inline-flex', alignItems: 'center', gap: '8px',
          cursor: 'pointer', fontFamily: 'var(--font-family-body)', fontSize: '0.85rem',
          color: 'var(--text-primary)',
        }}>
          <div style={{
            width: '36px', height: '20px', borderRadius: '10px', flexShrink: 0,
            background: p['checked'] === 'true' ? 'var(--accent-sym)' : 'rgba(255,255,255,0.15)',
            position: 'relative', transition: 'background 0.2s',
          }}>
            <div style={{
              width: '16px', height: '16px', borderRadius: '50%',
              background: '#fff', position: 'absolute', top: '2px',
              left: p['checked'] === 'true' ? '18px' : '2px',
              transition: 'left 0.2s',
            }} />
          </div>
          {p['text'] || children}
        </label>
      );

    case 'Slider': {
      const val = parseFloat(p['value'] || p['position'] || '50');
      const min = parseFloat(p['from'] || '0');
      const max = parseFloat(p['to'] || '100');
      return (
        <div key={index} style={{ ...style, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="range" readOnly defaultValue={String(val)} min={String(min)} max={String(max)}
            step={p['step'] || '1'} style={{ flex: 1, accentColor: 'var(--accent-sym)' }} />
          <span style={{
            fontFamily: 'var(--font-family-mono)', fontSize: '0.75rem',
            color: 'var(--text-secondary)', minWidth: '28px', textAlign: 'right',
          }}>{Math.round(val)}</span>
        </div>
      );
    }

    case 'ProgressBar':
      return (
        <div key={index} style={{
          ...style, height: style['height'] || '6px',
          background: 'rgba(255,255,255,0.08)', borderRadius: '3px',
          overflow: 'hidden', width: w !== null ? `${w}px` : '100%',
        }}>
          <div style={{
            width: `${p['value'] || p['progress'] || '0'}%`, height: '100%',
            background: 'var(--accent-sym)', borderRadius: '3px',
            transition: 'width 0.3s',
          }} />
        </div>
      );

    case 'BusyIndicator':
      return (
        <div key={index} style={{
          ...style, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            width: '24px', height: '24px',
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--accent-sym)', borderRadius: '50%',
            animation: 'qml-spin 0.8s linear infinite',
          }} />
        </div>
      );

    case 'Item':
    case 'MouseArea':
    case 'FocusScope':
      return (
        <div key={index} style={{
          ...style, // MouseArea is invisible but occupies space
          minWidth: w !== null ? undefined : undefined,
        }}>{children}</div>
      );

    case 'Label':
      return (
        <div key={index} style={{
          ...style, fontFamily: 'var(--font-family-body)', fontSize: '0.85rem',
          color: parseColor(p['color']) || 'var(--text-primary)',
          padding: '2px 0',
        }}>{p['text'] || children}</div>
      );

    case 'ComboBox':
      return (
        <select key={index} disabled style={{
          ...style, background: 'rgba(0,0,0,0.3)',
          border: '1px solid var(--border-color)', borderRadius: '4px',
          padding: '6px 10px', color: 'var(--text-primary)',
          fontFamily: 'var(--font-family-body)', fontSize: '0.85rem',
        }}>
          <option>{p['currentText'] || p['displayText'] || ''}</option>
        </select>
      );

    default:
      return (
        <div key={index} style={{
          ...style, fontFamily: 'monospace', fontSize: '0.72rem',
          color: 'var(--text-secondary)', border: '1px dashed rgba(255,255,255,0.1)',
          padding: '4px 8px', borderRadius: '3px',
        }}>
          <span style={{ opacity: 0.4 }}>{`<${el.type}>`}</span>
          {children}
        </div>
      );
  }
}

// ---------- Main component ----------

export const QMLViewer: React.FC<{ content: string; filename?: string }> = ({ content, filename }) => {
  const [mode, setMode] = React.useState<'preview' | 'code'>('preview');

  const preview = useMemo(() => {
    try {
      const elements = parseQML(content);
      if (elements.length === 0) return null;
      const ctx: RenderCtx = { bg: '#07080f', textColor: '#e2e6f0', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: '400' };
      return <>{elements.map((el, i) => renderElement(el, i, ctx))}</>;
    } catch (e) {
      return <div style={{ color: 'var(--accent-alert)', padding: 20 }}>Failed to parse QML: {(e as Error).message}</div>;
    }
  }, [content]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', gap: '4px', padding: '8px 12px',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(0,0,0,0.15)', flexShrink: 0,
      }}>
        <button
          onClick={() => setMode('preview')}
          style={{
            padding: '4px 12px', borderRadius: '3px',
            border: mode === 'preview' ? '1px solid var(--accent-sym)' : '1px solid transparent',
            background: mode === 'preview' ? 'rgba(38,222,129,0.1)' : 'transparent',
            color: mode === 'preview' ? 'var(--accent-sym)' : 'var(--text-secondary)',
            cursor: 'pointer', fontFamily: 'var(--font-family-mono)', fontSize: '0.78rem',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}
        >
          <IconEye size={ICON_SIZES.xs} /> Preview
        </button>
        <button
          onClick={() => setMode('code')}
          style={{
            padding: '4px 12px', borderRadius: '3px',
            border: mode === 'code' ? '1px solid var(--accent-sym)' : '1px solid transparent',
            background: mode === 'code' ? 'rgba(38,222,129,0.1)' : 'transparent',
            color: mode === 'code' ? 'var(--accent-sym)' : 'var(--text-secondary)',
            cursor: 'pointer', fontFamily: 'var(--font-family-mono)', fontSize: '0.78rem',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}
        >
          <IconCode size={ICON_SIZES.xs} /> Code
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {mode === 'preview' ? (
          <div style={{
            padding: '12px', minHeight: '100%',
            background: 'radial-gradient(ellipse at center, rgba(38,222,129,0.03) 0%, transparent 70%)',
          }}>
            {preview || (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px', opacity: 0.4 }}>🧩</div>
                <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.82rem' }}>
                  No QML elements found
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '8px', opacity: 0.6 }}>
                  Switch to Code view to see the source
                </div>
              </div>
            )}
          </div>
        ) : (
          <pre style={{
            margin: 0, padding: '16px', whiteSpace: 'pre-wrap',
            fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.5,
            color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)',
            height: '100%', overflow: 'auto',
          }}>
            {content}
          </pre>
        )}
      </div>
    </div>
  );
};
