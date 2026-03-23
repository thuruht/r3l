// AmbientBackground.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { IconVolume, IconVolumeOff, IconEye, IconEyeOff, IconPlayerPlay, IconPlayerPause } from '@tabler/icons-react';
import { ICON_SIZES } from '@/constants/iconSizes';
import { useCustomization } from '../context/CustomizationContext';

interface AmbientBackgroundProps {
  videoSrc?: string;
  audioSrc?: string;
}

const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ 
  videoSrc = 'https://assets.mixkit.co/videos/preview/mixkit-abstract-connection-of-dots-and-lines-on-a-dark-background-34480-large.mp4', 
  audioSrc = '/assets/ping.mp3' // Placeholder
}) => {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [visible, setVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { theme_preferences } = useCustomization();

  useEffect(() => {
    if (videoRef.current) {
      if (playing) videoRef.current.play().catch(() => setPlaying(false));
      else videoRef.current.pause();
    }
  }, [playing]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
      if (!muted) audioRef.current.play().catch(() => setMuted(true));
    }
  }, [muted]);

  const getNebulaStyle = () => {
    const primary = theme_preferences.node_primary_color || '#a29bf6';
    const secondary = theme_preferences.node_secondary_color || '#26de81';
    return {
      background: `radial-gradient(circle at 20% 30%, ${primary}22 0%, transparent 40%),
                   radial-gradient(circle at 80% 70%, ${secondary}22 0%, transparent 40%),
                   var(--bg-color)`
    };
  };

  const customBgUrl = theme_preferences.backgroundUrl;
  const isVideo = theme_preferences.backgroundType === 'video' || customBgUrl?.match(/\.(mp4|webm|mov)$/i);
  const activeVideoSrc = customBgUrl && isVideo ? customBgUrl : videoSrc;

  return (
    <>
        <div
            className="ambient-background"
            style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh',
                zIndex: 0, pointerEvents: 'none', overflow: 'hidden',
                ...(customBgUrl && !isVideo ? {
                    backgroundImage: `url(${customBgUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'none'
                } : getNebulaStyle())
            }}
            role="presentation"
            aria-hidden="true"
        >
            {activeVideoSrc && (
                <video
                    ref={videoRef}
                    src={activeVideoSrc}
                    loop
                    muted
                    playsInline
                    style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        minWidth: '100%', minHeight: '100%', objectFit: 'cover', opacity: 0.6, mixBlendMode: 'screen',
                        display: visible ? 'block' : 'none'
                    }}
                />
            )}
            {audioSrc && <audio ref={audioRef} src={audioSrc} loop />}

            {/* Stars / Dust Particles (CSS) */}
            <div className="stars" style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'radial-gradient(white 2px, transparent 2px)',
                backgroundSize: '70px 70px', opacity: visible ? 0.3 : 0,
                transition: 'opacity 0.5s'
            }}></div>
        </div>

        {/* Global Ambient Controls - Top Center to avoid collisions */}
        <div style={{
            position: 'fixed', 
            top: '12px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 'var(--z-header)',
            display: 'flex', 
            gap: '8px', 
            opacity: 0.4, 
            transition: 'opacity 0.3s',
            pointerEvents: 'auto'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.4'}
        >
            <button
                onClick={() => setVisible(!visible)}
                title={visible ? "Hide Ambiance" : "Show Ambiance"}
                style={{ padding: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
            >
                {visible ? <IconEye size={ICON_SIZES.md} /> : <IconEyeOff size={ICON_SIZES.md} />}
            </button>

            <button
                onClick={() => setPlaying(!playing)}
                title={playing ? "Pause" : "Play"}
                style={{ padding: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
            >
                {playing ? <IconPlayerPause size={ICON_SIZES.md} /> : <IconPlayerPlay size={ICON_SIZES.md} />}
            </button>

            {audioSrc && (
                <button
                    onClick={() => setMuted(!muted)}
                    title={muted ? "Unmute" : "Mute"}
                    style={{ padding: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                >
                    {muted ? <IconVolumeOff size={ICON_SIZES.md} /> : <IconVolume size={ICON_SIZES.md} />}
                </button>
            )}
        </div>
    </>
  );
};

export default AmbientBackground;
