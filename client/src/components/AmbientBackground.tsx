import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useCustomization } from '../context/CustomizationContext';
import { IconVolume, IconVolumeOff, IconEye, IconEyeOff, IconPlayerPlay, IconPlayerPause } from '@tabler/icons-react';

interface AmbientBackgroundProps {
  videoSrc?: string;
  audioSrc?: string;
}

const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ videoSrc, audioSrc }) => {
  const { theme } = useTheme();
  const { theme_preferences } = useCustomization();
  const [muted, setMuted] = useState(true);
  const [visible, setVisible] = useState(true);
  const [playing, setPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Auto-play management
  useEffect(() => {
    if (videoRef.current) {
      if (playing) videoRef.current.play().catch(() => {}); // Ignore autoplay blocks
      else videoRef.current.pause();
    }
    if (audioRef.current) {
        if (playing && !muted) audioRef.current.play().catch(() => {});
        else audioRef.current.pause();
    }
  }, [playing, muted, videoSrc, audioSrc]);

  // CSS Nebula Generator (Fallback if no video)
  const getNebulaStyle = () => {
      const isLight = theme === 'light';
      const density = theme_preferences.mistDensity ?? 0.5;

      const baseColor = isLight ? '#d4ebe3' : '#0a1a14';

      const layers = isLight ? [
          `radial-gradient(circle at 50% 50%, rgba(16, 185, 129, ${0.2 * density}) 0%, transparent 60%)`,
          `radial-gradient(circle at 85% 15%, rgba(6, 182, 212, ${0.18 * density}) 0%, transparent 50%)`,
          `radial-gradient(circle at 15% 85%, rgba(139, 92, 246, ${0.15 * density}) 0%, transparent 50%)`,
          `radial-gradient(circle at 50% 0%, rgba(52, 211, 153, ${0.12 * density}) 0%, transparent 60%)`,
      ] : [
          `radial-gradient(circle at 50% 50%, rgba(16, 185, 129, ${0.3 * density}) 0%, transparent 60%)`,
          `radial-gradient(circle at 80% 20%, rgba(6, 182, 212, ${0.25 * density}) 0%, transparent 50%)`,
          `radial-gradient(circle at 20% 80%, rgba(139, 92, 246, ${0.25 * density}) 0%, transparent 50%)`,
          `radial-gradient(circle at 50% 0%, rgba(52, 211, 153, ${0.2 * density}) 0%, transparent 60%)`,
      ];

      return {
          backgroundColor: baseColor,
          backgroundImage: layers.join(','),
          filter: isLight ? 'blur(90px) contrast(1.3) brightness(1.05)' : 'blur(60px) contrast(1.4) brightness(1.2)',
          transition: 'all 2s ease-in-out',
          backgroundBlendMode: 'screen'
      };
  };

  if (!visible) return null;

  const customBgUrl = theme_preferences.backgroundUrl;
  const isVideo = theme_preferences.backgroundType === 'video' || customBgUrl?.match(/\.(mp4|webm|mov)$/i);
  const activeVideoSrc = customBgUrl && isVideo ? customBgUrl : videoSrc;

  return (
    <>
        <div
            className="ambient-background"
            style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
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
                        minWidth: '100%', minHeight: '100%', objectFit: 'cover', opacity: 0.6, mixBlendMode: 'screen'
                    }}
                />
            )}
            {audioSrc && <audio ref={audioRef} src={audioSrc} loop />}

            {/* Stars / Dust Particles (CSS) */}
            <div className="stars" style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'radial-gradient(white 2px, transparent 2px)',
                backgroundSize: '70px 70px', opacity: 0.3
            }}></div>
        </div>

        {/* Subtle Controls */}
        <div style={{
            position: 'fixed', bottom: '20px', left: '20px', zIndex: 50,
            display: 'flex', gap: '8px', opacity: 0.5, transition: 'opacity 0.3s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
        >
            <button
                onClick={() => setVisible(!visible)}
                title={visible ? "Hide Ambiance" : "Show Ambiance"}
                style={{ padding: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%' }}
            >
                {visible ? <IconEye size={16} /> : <IconEyeOff size={16} />}
            </button>

            {visible && (
                <>
                    <button
                        onClick={() => setPlaying(!playing)}
                        title={playing ? "Pause" : "Play"}
                        style={{ padding: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%' }}
                    >
                        {playing ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
                    </button>
                    {audioSrc && (
                        <button
                            onClick={() => setMuted(!muted)}
                            title={muted ? "Unmute" : "Mute"}
                            style={{ padding: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%' }}
                        >
                            {muted ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
                        </button>
                    )}
                </>
            )}
        </div>
    </>
  );
};

export default AmbientBackground;
