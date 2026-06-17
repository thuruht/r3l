import React, { useEffect, useState } from 'react';
import { MarkdownViewer } from './MarkdownViewer';
import Skeleton from './Skeleton';

interface NotebookCell {
  cell_type: 'markdown' | 'code' | 'raw';
  source: string[];
  outputs?: { output_type: string; text?: string[]; data?: Record<string, any> }[];
  execution_count?: number | null;
}

interface Notebook {
  cells: NotebookCell[];
  metadata?: any;
}

export const NotebookViewer: React.FC<{ url: string }> = ({ url }) => {
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(url)
      .then(r => { if (!r.ok) throw new Error('Failed to load notebook'); return r.json(); })
      .then(setNotebook)
      .catch(e => setError(e.message));
  }, [url]);

  if (error) return <div style={{ color: 'var(--accent-alert)', padding: 20 }}>{error}</div>;
  if (!notebook) return <Skeleton height="100%" width="100%" />;

  return (
    <div style={{ padding: '24px', overflow: 'auto', height: '100%' }}>
      {notebook.cells.map((cell, i) => (
        <div key={i} style={{ marginBottom: '16px' }}>
          {cell.cell_type === 'markdown' ? (
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '4px', padding: '8px 12px' }}>
              <MarkdownViewer content={cell.source.join('')} />
            </div>
          ) : cell.cell_type === 'code' ? (
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                background: 'rgba(0,0,0,0.3)', padding: '6px 12px',
                fontFamily: 'var(--font-family-mono)', fontSize: '0.75rem',
                color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)',
              }}>
                [{cell.execution_count ?? ' '}]
              </div>
              <pre style={{
                margin: 0, padding: '12px', overflow: 'auto',
                fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.5,
                color: 'var(--text-primary)', background: 'rgba(38,222,129,0.02)',
              }}>{cell.source.join('')}</pre>
              {cell.outputs && cell.outputs.length > 0 && cell.outputs.map((out, j) => (
                <div key={j} style={{
                  borderTop: '1px solid var(--border-color)',
                  padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.82rem',
                  background: 'rgba(0,0,0,0.15)',
                }}>
                  {out.output_type === 'stream' && out.text && (
                    <pre style={{ margin: 0, color: 'var(--text-secondary)' }}>{out.text.join('')}</pre>
                  )}
                  {out.output_type === 'execute_result' && out.data && out.data['text/plain'] && (
                    <pre style={{ margin: 0, color: 'var(--accent-sym)' }}>{(out.data['text/plain'] as string[]).join('')}</pre>
                  )}
                  {out.output_type === 'error' && out.text && (
                    <pre style={{ margin: 0, color: 'var(--accent-alert)' }}>{out.text.join('')}</pre>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};
