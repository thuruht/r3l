import { useState, useEffect } from 'react';

export const useWindowSize = () => {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const handler = () => {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    };

    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return { ...size, isMobile: size.w < 768 };
};
