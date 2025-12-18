// UserDiscovery.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSearch, IconDice } from '@tabler/icons-react';

export const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{id: number, username: string, avatar_url: string}[]>([]);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length >= 2) {
        try {
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = await res.json();
            setResults(data.users || []);
          }
        } catch (error) {
          console.error('Search failed:', error);
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', marginRight: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-mist)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0 8px' }}>
        <IconSearch size={16} color="var(--text-secondary)" />
        <input
          type="text"
          placeholder="Search..."
          aria-label="Search users"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--text-primary)', 
            padding: '6px 8px', 
            width: '150px',
            outline: 'none'
          }}
        />
      </div>
      {results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--bg-mist)', border: '1px solid var(--border-color)',
          borderRadius: '4px', marginTop: '4px', zIndex: 5000,
          maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          {results.map((user) => (
            <div
              key={user.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                navigate(`/communique/${user.id}`);
                setQuery('');
                setResults([]);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate(`/communique/${user.id}`);
                  setQuery('');
                  setResults([]);
                }
              }}
              style={{ padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              // Use CSS variable for hover to support light/dark modes
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
               {user.avatar_url && <img src={user.avatar_url} alt={user.username} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />}
               <span style={{ fontSize: '0.9em' }}>{user.username}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const RandomUserButton: React.FC = () => {
  const navigate = useNavigate();
  const handleRandom = async () => {
    try {
      const res = await fetch('/api/users/random');
      if (res.ok) {
        const data = await res.json();
        if (data.user) navigate(`/communique/${data.user.id}`);
      }
    } catch (e) { console.error(e); }
  };

  return (
    <button onClick={handleRandom} title="Random User" aria-label="Go to random user" style={{ marginRight: '10px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
      <IconDice size={18} />
    </button>
  );
};