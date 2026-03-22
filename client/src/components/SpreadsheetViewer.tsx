import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { sanitizeHTML } from '../utils/sanitize';

export const SpreadsheetViewer: React.FC<{ url: string }> = ({ url }) => {
    const [html, setHtml] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(url)
            .then(res => res.arrayBuffer())
            .then(ab => {
                const wb = XLSX.read(ab, { type: 'array' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_html(ws);
                setHtml(sanitizeHTML(data));
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
                setHtml('<p>Error loading spreadsheet.</p>');
            });
    }, [url]);

    if (loading) return <div style={{ padding: '20px' }}>Loading spreadsheet...</div>;

    return (
        <div 
            dangerouslySetInnerHTML={{ __html: html }} 
            style={{ 
                background: 'var(--bg-mist)', 
                color: 'var(--text-primary)', 
                padding: '20px', 
                overflow: 'auto', 
                width: '100%', 
                height: '100%' 
            }} 
            className="spreadsheet-viewer"
        />
    );
};
