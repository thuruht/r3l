import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  children?: React.ReactNode;
}

const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, userId, children }) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      gsap.to(drawerRef.current, {
        x: '0%',
        duration: 0.5,
        ease: 'power3.out'
      });
    } else {
      gsap.to(drawerRef.current, {
        x: '100%',
        duration: 0.5,
        ease: 'power3.in'
      });
    }
  }, [isOpen]);

  return (
    <div className="drawer" ref={drawerRef}>
      <div className="drawer-header">
        <h3>{userId ? `User: ${userId}` : 'Profile'}</h3>
        <button className="close-btn" onClick={onClose}>[X]</button>
      </div>
      <div className="communique-content">
        {children || <p>Loading communique...</p>}
      </div>
    </div>
  );
};

export default Drawer;