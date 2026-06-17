import React, { useEffect, useState } from 'react';
import Skeleton from './Skeleton';

export const MermaidViewer: React.FC<{ content: string }> = ({ content }) => {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = await import('mermaid');
        mermaid.default.initialize({
          theme: 'dark',
          themeVariables: {
            primaryColor: 'rgba(38,222,129,0.15)',
            primaryTextColor: '#e2e6f0',
            primaryBorderColor: '#26de81',
            lineColor: '#4a6652',
            secondaryColor: 'rgba(122,120,112,0.15)',
            tertiaryColor: 'rgba(0,0,0,0.3)',
            fontSize: '14px',
          },
          fontFamily: '"Inter", sans-serif',
        });
        const { svg: rendered } = await mermaid.default.render('mermaid-' + Math.random().toString(36).slice(2), content);
        if (!cancelled) setSvg(rendered);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [content]);

  if (error) return (
    <div style={{ padding: '20px', color: 'var(--accent-alert)', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.82rem', marginBottom: '8px' }}>Failed to render diagram</div>
      <div style={{ fontSize: '0.75rem', opacity: 0.7, fontFamily: 'monospace' }}>{error}</div>
    </div>
  );

  if (!svg) return <Skeleton height="100%" width="100%" />;

  return (
    <div style={{
      padding: '20px', overflow: 'auto', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ maxWidth: '100%' }} dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
};
