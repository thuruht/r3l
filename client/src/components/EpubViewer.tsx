import React, { useEffect, useRef, useState } from 'react';
import ePub, { Rendition } from 'epubjs';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';

export const EpubViewer: React.FC<{ url: string }> = ({ url }) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    const [rendition, setRendition] = useState<Rendition | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!viewerRef.current) return;
        setLoading(true);

        const book = ePub(url);
        const rend = book.renderTo(viewerRef.current, {
            width: '100%',
            height: '100%',
            flow: 'paginated',
            manager: 'default'
        });

        rend.display().then(() => {
            setLoading(false);
        });

        setRendition(rend);

        return () => {
            book.destroy();
        };
    }, [url]);

    const prev = () => rendition?.prev();
    const next = () => rendition?.next();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f5f5f5', borderRadius: '4px', position: 'relative' }}>
            {loading && <div style={{ padding: '20px', color: '#333' }}>Opening eBook...</div>}
            <div ref={viewerRef} style={{ flex: 1 }} />
            <div style={{ 
                position: 'absolute', bottom: '20px', left: 0, right: 0, 
                display: 'flex', justifyContent: 'center', gap: '40px',
                pointerEvents: 'none'
            }}>
                <button onClick={prev} style={{ 
                    pointerEvents: 'auto', background: 'rgba(0,0,0,0.5)', border: 'none', 
                    color: 'white', borderRadius: '50%', padding: '10px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center'
                }}>
                    <IconChevronLeft size={ICON_SIZES.lg} />
                </button>
                <button onClick={next} style={{ 
                    pointerEvents: 'auto', background: 'rgba(0,0,0,0.5)', border: 'none', 
                    color: 'white', borderRadius: '50%', padding: '10px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center'
                }}>
                    <IconChevronRight size={ICON_SIZES.lg} />
                </button>
            </div>
        </div>
    );
};
