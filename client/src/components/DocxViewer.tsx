import React, { useEffect, useState } from 'react';
import mammoth from 'mammoth';
import { sanitizeHTML } from '../utils/sanitize';

export const DocxViewer: React.FC<{ url: string }> = ({ url }) => {
    const [html, setHtml] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(url)
            .then(res => res.arrayBuffer())
            .then(ab => {
                mammoth.convertToHtml({ arrayBuffer: ab })
                    .then(result => {
                        setHtml(sanitizeHTML(result.value));
                        setLoading(false);
                    })
                    .catch(err => {
                        console.error(err);
                        setHtml('<p>Error rendering document.</p>');
                        setLoading(false);
                    });
            });
    }, [url]);

    if (loading) return <div style={{ padding: '20px' }}>Loading document...</div>;

    return (
        <div 
            dangerouslySetInnerHTML={{ __html: html }} 
            style={{ 
                background: '#fff', // Word docs usually need a white background for readability
                color: '#000', 
                padding: '40px', 
                overflow: 'auto', 
                width: '100%', 
                height: '100%' 
            }} 
            className="docx-viewer"
        />
    );
};
