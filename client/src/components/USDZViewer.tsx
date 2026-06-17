import React from 'react';
import { IconDownload } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';

export const USDZViewer: React.FC<{ url: string; filename: string }> = ({ url, filename }) => {
  const isAR = typeof navigator !== 'undefined' && (
    /iPad|iPhone|iPod|Mac/.test(navigator.userAgent) ||
    'xr' in navigator
  );

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '24px', height: '100%',
      color: 'var(--text-secondary)', textAlign: 'center', padding: '40px',
    }}>
      <div style={{ fontSize: '4rem', opacity: 0.6 }}>🥽</div>
      <div style={{ fontFamily: 'var(--font-family-heading)', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
        3D Model — USDZ
      </div>
      {isAR ? (
        <a
          href={url}
          rel="ar"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px', background: 'var(--accent-sym)', color: '#000',
            borderRadius: '4px', textDecoration: 'none', fontWeight: 700,
            fontFamily: 'var(--font-family-heading)', fontSize: '0.85rem',
          }}
        >
          <IconDownload size={ICON_SIZES.sm} />
          View in AR
        </a>
      ) : (
        <a
          href={url}
          download={filename}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px', border: '1px solid var(--border-color)',
            color: 'var(--text-primary)', borderRadius: '4px',
            textDecoration: 'none', fontFamily: 'var(--font-family-heading)',
            fontSize: '0.85rem',
          }}
        >
          <IconDownload size={ICON_SIZES.sm} />
          Download USDZ
        </a>
      )}
      <div style={{ fontSize: '0.82rem', maxWidth: '400px' }}>
        USDZ models can be viewed in AR on Apple devices. On other platforms, download the file for use in 3D applications.
      </div>
    </div>
  );
};
