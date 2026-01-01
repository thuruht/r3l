import React, { useRef, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { EditorView } from '@codemirror/view';
import * as Y from 'yjs';
import { yCollab } from 'y-codemirror.next';
import { WebsocketProvider } from 'y-websocket';

interface CodeEditorProps {
  content: string; // Initial content
  onChange: (val: string) => void;
  filename: string;
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ content, onChange, filename, ydoc, provider }) => {
  const editorRef = useRef<any>(null);

  // Determine language extension based on filename
  const getExtensions = () => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const baseExtensions = [EditorView.theme({
        "&": { height: "100%", backgroundColor: "transparent" },
        ".cm-content": { caretColor: "var(--accent-sym)" },
        ".cm-scroller": { fontFamily: "monospace" }
    }, { dark: true })];

    if (ydoc && provider) {
        // Add Yjs collaboration extension
        const ytext = ydoc.getText('codemirror');
        // Note: y-codemirror.next handles binding automatically via this extension
        // We pass 'null' for undoManager to let CodeMirror handle history or manage it externally if needed
        baseExtensions.push(yCollab(ytext, provider.awareness));
    }

    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return [...baseExtensions, javascript({ jsx: true, typescript: true })];
      case 'py':
        return [...baseExtensions, python()];
      case 'md':
        return [...baseExtensions, markdown()];
      case 'html':
        return [...baseExtensions, html()];
      case 'css':
        return [...baseExtensions, css()];
      default:
        return baseExtensions;
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
      <CodeMirror
        value={content} // Always pass content initially. If Yjs is active, yCollab will take over, but this ensures initial render is not empty if yText is synced.
        height="100%"
        theme="dark"
        extensions={getExtensions()}
        onChange={(val) => {
            // If not collaborative, we need to bubble up changes manually.
            // If collaborative, y-codemirror handles sync, but we might still want to update local state for 'save' button.
            onChange(val);
        }}
        basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            foldGutter: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;