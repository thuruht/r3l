import React, { useEffect, useState } from 'react';
import Skeleton from './Skeleton';

interface ExcalidrawElement {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: string;
  strokeWidth: number;
  strokeStyle: string;
  roughness: number;
  opacity: number;
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  points?: number[][];
  isArrow?: boolean;
}

interface ExcalidrawFile {
  type: string;
  elements: ExcalidrawElement[];
}

function elToPath(el: ExcalidrawElement): string {
  const { x, y, width, height } = el;
  switch (el.type) {
    case 'rectangle':
      return `M ${x} ${y} h ${width} v ${height} h ${-width} Z`;
    case 'ellipse':
      const cx = x + width / 2;
      const cy = y + height / 2;
      const rx = width / 2;
      const ry = height / 2;
      return `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0`;
    case 'diamond':
      const mx = x + width / 2;
      const my = y + height / 2;
      return `M ${mx} ${y} L ${x + width} ${my} L ${mx} ${y + height} L ${x} ${my} Z`;
    case 'line':
    case 'arrow':
      if (el.points && el.points.length >= 2) {
        return el.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x + p[0]} ${y + p[1]}`).join(' ');
      }
      return '';
    default:
      return '';
  }
}

export const ExcalidrawViewer: React.FC<{ url: string }> = ({ url }) => {
  const [data, setData] = useState<ExcalidrawFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(url)
      .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json(); })
      .then(setData)
      .catch(e => setError(e.message));
  }, [url]);

  if (error) return <div style={{ color: 'var(--accent-alert)', padding: 20 }}>{error}</div>;
  if (!data) return <Skeleton height="100%" width="100%" />;

  const elements = data.elements || [];
  if (elements.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Empty drawing</div>;
  }

  // Compute bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + (el.width || 100));
    maxY = Math.max(maxY, el.y + (el.height || 100));
  }
  const pad = 40;
  const vw = maxX - minX + pad * 2;
  const vh = maxY - minY + pad * 2;

  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'auto',
      background: 'rgba(0,0,0,0.15)',
    }}>
      <svg
        viewBox={`${minX - pad} ${minY - pad} ${vw} ${vh}`}
        style={{ width: '100%', height: '100%', minWidth: `${vw}px`, minHeight: `${vh}px` }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {elements.map((el, i) => {
          const isFilled = el.type !== 'line' && el.type !== 'arrow';
          const path = elToPath(el);
          if (!path) return null;

          const strokeDasharray = el.strokeStyle === 'dashed' ? '8 4' : el.strokeStyle === 'dotted' ? '2 2' : undefined;

          return (
            <g key={i} opacity={el.opacity / 100}>
              {isFilled && (
                <path
                  d={path}
                  fill={el.backgroundColor || 'transparent'}
                  fillOpacity={el.fillStyle === 'solid' ? 1 : 0.3}
                  stroke="none"
                />
              )}
              <path
                d={path}
                fill="none"
                stroke={el.strokeColor || 'var(--accent-sym)'}
                strokeWidth={el.strokeWidth || 1}
                strokeDasharray={strokeDasharray}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {el.type === 'arrow' && el.points && el.points.length >= 2 && (
                <ArrowHead
                  from={el.points[el.points.length - 2]}
                  to={el.points[el.points.length - 1]}
                  x={el.x} y={el.y}
                  color={el.strokeColor || 'var(--accent-sym)'}
                  strokeWidth={el.strokeWidth || 1}
                />
              )}
              {el.text && (
                <text
                  x={el.x + el.width / 2}
                  y={el.y + el.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={el.strokeColor || 'var(--text-primary)'}
                  fontSize={el.fontSize || 16}
                  fontFamily={el.fontFamily === 2 ? 'var(--font-family-heading)' : el.fontFamily === 3 ? 'monospace' : 'var(--font-family-body)'}
                  style={{ pointerEvents: 'none' }}
                >
                  {el.text}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

function ArrowHead({ from, to, x, y, color, strokeWidth }: {
  from: number[]; to: number[]; x: number; y: number; color: string; strokeWidth: number;
}) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = Math.max(8, strokeWidth * 4);
  const head = `${x + x2} ${y + y2}`;
  const left = `${x + x2 - size * Math.cos(angle - Math.PI / 6)} ${y + y2 - size * Math.sin(angle - Math.PI / 6)}`;
  const right = `${x + x2 - size * Math.cos(angle + Math.PI / 6)} ${y + y2 - size * Math.sin(angle + Math.PI / 6)}`;
  return (
    <polygon
      points={`${head} ${left} ${right}`}
      fill={color}
      stroke="none"
    />
  );
}
