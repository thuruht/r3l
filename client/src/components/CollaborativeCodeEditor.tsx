import React, { useState, useEffect } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import CodeEditor from './CodeEditor';

interface CollaborativeCodeEditorProps {
  fileId: string;
  currentUser?: any;
  themePreferences: any;
  initialContent: string;
  filename: string;
  onChange: (val: string) => void;
  onStatusChange: (status: 'disconnected' | 'connecting' | 'connected') => void;
  onUsersChange: (users: any[]) => void;
}

const CollaborativeCodeEditor: React.FC<CollaborativeCodeEditorProps> = ({
  fileId,
  currentUser,
  themePreferences,
  initialContent,
  filename,
  onChange,
  onStatusChange,
  onUsersChange
}) => {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);

  useEffect(() => {
    let currentProvider: WebsocketProvider | null = null;
    let currentDoc: Y.Doc | null = null;

    onStatusChange('connecting');
    const doc = new Y.Doc();
    const wsUrl = window.location.protocol === 'https:' ? `wss://${window.location.host}` : `ws://${window.location.host}`;

    const prov = new WebsocketProvider(`${wsUrl}/api/collab/${fileId}`, '', doc);

    const userColor = themePreferences.node_primary_color || '#' + Math.floor(Math.random()*16777215).toString(16);
    prov.awareness.setLocalStateField('user', {
      name: currentUser?.username || 'Anonymous',
      color: userColor,
      id: currentUser?.id
    });

    prov.awareness.on('change', () => {
      const states = Array.from(prov.awareness.getStates().values());
      const users = states.map((s: any) => s.user).filter((u: any) => u);
      onUsersChange(users);
    });

    prov.on('status', (event: { status: 'disconnected' | 'connecting' | 'connected' }) => {
      onStatusChange(event.status);
    });

    const yText = doc.getText('codemirror');

    if (initialContent && yText.length === 0) {
      yText.insert(0, initialContent);
    }

    if (yText.toString() === '' && initialContent !== '') {
      yText.insert(0, initialContent);
    }

    yText.observe(() => {
      onChange(yText.toString());
    });

    setYdoc(doc);
    setProvider(prov);
    currentProvider = prov;
    currentDoc = doc;

    return () => {
      onStatusChange('disconnected');
      onUsersChange([]);
      if (currentProvider) currentProvider.destroy();
      if (currentDoc) currentDoc.destroy();
    };
  }, [fileId]);

  return (
    <CodeEditor
      content={initialContent}
      onChange={onChange}
      filename={filename}
      ydoc={ydoc}
      provider={provider}
    />
  );
};

export default CollaborativeCodeEditor;
