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
import { useTheme } from '../context/ThemeContext';

interface CodeEditorProps {
  content: string; // Initial content
  onChange: (val: string) => void;
  filename: string;
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ content, onChange, filename, ydoc, provider }) => {
  const editorRef = useRef<any>(null);
  const { theme } = useTheme();

  // Determine language extension based on filename
  const getExtensions = () => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const isDark = theme === 'dark';
    const baseExtensions = [EditorView.theme({
        "&": { height: "100%", backgroundColor: "transparent" },
        ".cm-content": { caretColor: "var(--accent-sym)" },
        ".cm-scroller": { fontFamily: "monospace" }
    }, { dark: isDark })];

    if (ydoc && provider) {
        const ytext = ydoc.getText('codemirror');
        baseExtensions.push(yCollab(ytext, provider.awareness));
    }

    switch (ext) {
      case 'js':
      case 'jsx':
      case 'mjs':
      case 'cjs':
        return [...baseExtensions, javascript({ jsx: true })];
      case 'ts':
      case 'tsx':
        return [...baseExtensions, javascript({ jsx: true, typescript: true })];
      case 'py':
        return [...baseExtensions, python()];
      case 'md':
      case 'markdown':
        return [...baseExtensions, markdown()];
      case 'html':
      case 'htm':
      case 'xml':
      case 'svg':
        return [...baseExtensions, html()];
      case 'css':
      case 'scss':
      case 'sass':
      case 'less':
        return [...baseExtensions, css()];
      case 'json':
      case 'rs':
      case 'java':
      case 'cpp':
      case 'c':
      case 'h':
      case 'php':
      case 'rb':
      case 'go':
      case 'swift':
      case 'kt':
      case 'scala':
      case 'sh':
      case 'bash':
      case 'sql':
        return [...baseExtensions, javascript()];
      default:
        return baseExtensions;
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
      <CodeMirror
        value={content}
        height="100%"
        theme={theme === 'dark' ? 'dark' : 'light'}
        extensions={getExtensions()}
        onChange={(val) => {
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