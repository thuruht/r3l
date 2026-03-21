import React, { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { IconFile, IconFolder } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';

export const ZipViewer: React.FC<{ url: string }> = ({ url }) => {
    const [files, setFiles] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(url)
            .then(res => res.arrayBuffer())
            .then(ab => JSZip.loadAsync(ab))
            .then(zip => {
                const names: string[] = [];
                zip.forEach((relativePath) => {
                    names.push(relativePath);
                });
                setFiles(names.sort());
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [url]);

    if (loading) return <div style={{ padding: '20px' }}>Analyzing archive...</div>;

    return (
        <div style={{ padding: '20px', color: 'var(--text-primary)', background: 'var(--bg-mist)', height: '100%', overflow: 'auto' }}>
            <h4 style={{ marginBottom: '15px', color: 'var(--accent-sym)' }}>Archive Contents</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {files.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', opacity: 0.8 }}>
                        {f.endsWith('/') ? <IconFolder size={ICON_SIZES.md} /> : <IconFile size={ICON_SIZES.md} />}
                        <span>{f}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
