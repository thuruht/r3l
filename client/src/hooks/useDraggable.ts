import { useState, useCallback, useEffect } from 'react';

interface DraggableProps {
  initialX: number;
  initialY: number;
  initialW: number;
  initialH: number;
}

export const useDraggable = ({ initialX, initialY, initialW, initialH }: DraggableProps) => {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ w: initialW, h: initialH });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    });
  }, [pos.x, pos.y]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      // Constrain to viewport (simplified)
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      setPos({ x: newX, y: Math.max(0, newY) }); // Prevent going above top
    } else if (isResizing) {
      setSize(prev => ({
        w: Math.max(300, e.clientX - pos.x),
        h: Math.max(200, e.clientY - pos.y)
      }));
    }
  }, [isDragging, isResizing, dragOffset, pos]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  return { pos, size, handleDragStart, handleResizeStart, isDragging };
};
