import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface RichTextEditorProps {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  currentUser: any;
  themePreferences?: any;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ ydoc, provider, currentUser, themePreferences }) => {
  const userColor = themePreferences?.node_primary_color || '#' + Math.floor(Math.random()*16777215).toString(16);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // @ts-ignore: Required by Tiptap collab docs, but TS types might be strict
        history: false, // History is handled by Y.js
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name: currentUser?.username || 'Anonymous',
          color: userColor,
        },
      }),
    ],
  });

  return (
    <div style={{ 
        padding: '20px', 
        background: 'var(--bg-mist)', 
        color: 'var(--text-primary)', 
        height: '100%', 
        overflow: 'auto',
        fontFamily: 'var(--font-family-base)'
    }}>
        <style>{`
            /* Tiptap collaboration cursors */
            .collaboration-cursor__caret {
                border-left: 2px solid #000;
                border-right: 2px solid #000;
                margin-left: -2px;
                margin-right: -2px;
                pointer-events: none;
                position: relative;
                word-break: normal;
            }
            .collaboration-cursor__label {
                border-radius: 3px;
                color: #fff;
                font-size: 12px;
                font-weight: 600;
                left: -2px;
                line-height: normal;
                padding: 3px 6px;
                position: absolute;
                top: -1.4em;
                user-select: none;
                white-space: nowrap;
            }
            .ProseMirror {
                outline: none;
                min-height: 100%;
            }
        `}</style>
      <EditorContent editor={editor} />
    </div>
  );
};
