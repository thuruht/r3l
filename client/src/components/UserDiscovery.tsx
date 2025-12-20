// UserDiscovery.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSearch, IconDice, IconX } from '@tabler/icons-react';

export const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{id: number, username: string, avatar_url: string}[]>([]);
  const navigate = useNavigate();
  // const wrapperRef = useRef<HTMLDivElement>(null); // Removed as we use a modal now

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
        setResults([]); // Clear results if query is short, but we might want to keep the modal open if user just cleared text? No, let's keep it simple.
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const closeSearch = () => {
      setQuery('');
      setResults([]);
  };

  return (
    <>
      <div style={{ position: 'relative', marginRight: '10px', zIndex: 2000 }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0 8px' }}>
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
              width: '120px', // Slightly smaller to save space
              outline: 'none',
              fontSize: '0.9rem'
            }}
          />
          {query && <button onClick={closeSearch} style={{background: 'none', border:'none', padding: 0, color: 'var(--text-secondary)', cursor: 'pointer'}}><IconX size={14}/></button>}
        </div>
      </div>

      {results.length > 0 && (
        <div className="search-modal-overlay fade-in" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.7)', zIndex: 4000, display: 'flex', justifyContent: 'center', alignItems: 'center',
          backdropFilter: 'blur(5px)'
        }} onClick={closeSearch}>
          <div className="glass-panel" style={{
            width: '400px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto',
            padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Search Results</h3>
                <button onClick={closeSearch} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}><IconX size={20} /></button>
            </div>
            
            {results.map((user) => (
              <div
                key={user.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  navigate(`/communique/${user.id}`);
                  closeSearch();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate(`/communique/${user.id}`);
                    closeSearch();
                  }
                }}
                style={{ 
                    padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', 
                    background: 'rgba(255,255,255,0.03)', borderRadius: '8px', transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              >
                 <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: user.avatar_url ? `url(${user.avatar_url}) center/cover` : '#333' }}></div>
                 <span style={{ fontSize: '1rem', fontWeight: 500 }}>{user.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
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
    <button 
      onClick={handleRandom} 
      title="Drift to Random User" 
      aria-label="Go to random user" 
      style={{ 
        marginRight: '10px', 
        padding: '5px 10px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '5px',
        borderColor: 'var(--accent-asym)',
        color: 'var(--accent-asym)',
        background: 'transparent'
      }}
      onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-sym)';
          e.currentTarget.style.color = 'var(--accent-sym)';
      }}
      onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-asym)';
          e.currentTarget.style.color = 'var(--accent-asym)';
      }}
    >
      <IconDice size={18} />
    </button>
  );
};