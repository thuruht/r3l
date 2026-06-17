import React, { useEffect, useState } from 'react';
import Skeleton from './Skeleton';

export const ParquetViewer: React.FC<{ url: string }> = ({ url }) => {
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hyparquet = await import('hyparquet');
        const file = hyparquet.asyncBufferFromUrl({ url });
        const meta = await hyparquet.parquetMetadataAsync(file);
        if (cancelled) return;

        const schema = hyparquet.parquetSchema(meta);
        const colNames = schema.children.map((c: any) => c.element.name);
        if (cancelled) return;
        setColumns(colNames);
        setTotalRows(meta.num_rows);

        const data = await hyparquet.parquetReadObjects({
          file,
          metadata: meta,
          rowStart: 0,
          rowEnd: Math.min(100, meta.num_rows),
        });
        if (!cancelled) setRows(data as Record<string, any>[]);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (error) return (
    <div style={{ padding: '20px', color: 'var(--accent-alert)', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.82rem', marginBottom: '8px' }}>Failed to read parquet</div>
      <div style={{ fontSize: '0.75rem', opacity: 0.7, fontFamily: 'monospace' }}>{error}</div>
    </div>
  );

  if (columns.length === 0) return <Skeleton height="100%" width="100%" />;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: '8px 12px', borderBottom: '1px solid var(--border-color)',
        fontFamily: 'var(--font-family-mono)', fontSize: '0.78rem',
        color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.15)',
        display: 'flex', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <span>{columns.length} columns</span>
        <span>{totalRows.toLocaleString()} rows{rows.length < totalRows ? ` (showing ${rows.length})` : ''}</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse',
          fontFamily: 'monospace', fontSize: '0.78rem',
        }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)', position: 'sticky', top: 0 }}>
              <th style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-color)', color: 'var(--accent-sym)', textAlign: 'left', whiteSpace: 'nowrap' }}>#</th>
              {columns.map(col => (
                <th key={col} style={{
                  padding: '6px 10px', borderBottom: '1px solid var(--border-color)',
                  color: 'var(--accent-sym)', textAlign: 'left', whiteSpace: 'nowrap',
                }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
              }}>
                <td style={{ padding: '4px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{i + 1}</td>
                {columns.map(col => (
                  <td key={col} style={{
                    padding: '4px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    color: 'var(--text-primary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {formatCell(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function formatCell(val: any): string {
  if (val === null || val === undefined) return <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>NULL</span> as any;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}
