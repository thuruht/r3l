import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { IconVolume, IconVolumeOff, IconEye, IconEyeOff, IconPlayerPlay, IconPlayerPause } from '@tabler/icons-react';

interface AmbientBackgroundProps {
  videoSrc?: string;
  audioSrc?: string;
}

const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ videoSrc, audioSrc }) => {
  const { theme } = useTheme();
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
      const baseColor = theme === 'verdant' ? '#05140a' : '#0a0b10';
      const mistColor1 = theme === 'verdant' ? 'rgba(38, 222, 129, 0.1)' : 'rgba(100, 100, 255, 0.05)';
      const mistColor2 = theme === 'verdant' ? 'rgba(20, 80, 40, 0.2)' : 'rgba(140, 50, 180, 0.08)';

      return {
          background: baseColor,
          backgroundImage: `
            radial-gradient(circle at 50% 50%, ${mistColor1} 0%, transparent 60%),
            radial-gradient(circle at 80% 20%, ${mistColor2} 0%, transparent 50%),
            radial-gradient(circle at 20% 80%, ${mistColor2} 0%, transparent 50%)
          `,
          filter: 'blur(30px)',
          transition: 'all 2s ease-in-out'
      };
  };

  if (!visible) return null;

  return (
    <>
        <div
            className="ambient-background"
            style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                zIndex: -1, pointerEvents: 'none', overflow: 'hidden',
                ...getNebulaStyle()
            }}
            role="presentation"
            aria-hidden="true"
        >
            {videoSrc && (
                <video
                    ref={videoRef}
                    src={videoSrc}
                    loop
                    muted
                    playsInline
                    style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        minWidth: '100%', minHeight: '100%', objectFit: 'cover', opacity: 0.4, mixBlendMode: 'screen'
                    }}
                />
            )}
            {audioSrc && <audio ref={audioRef} src={audioSrc} loop />}

            {/* Stars / Dust Particles (CSS) */}
            <div className="stars" style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
                backgroundSize: '50px 50px', opacity: 0.1
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
