import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  marginBottom?: string;
  count?: number;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = '20px', borderRadius = '4px', marginBottom = '10px', count, style }) => {
  if (count && count > 1) {
    return (
      <>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="skeleton-pulse" style={{
            width,
            height,
            borderRadius,
            marginBottom,
            backgroundColor: '#ffffff11',
            ...style
          }} />
        ))}
      </>
    );
  }
  return (
    <div className="skeleton-pulse" style={{
      width,
      height,
      borderRadius,
      marginBottom,
      backgroundColor: '#ffffff11',
      ...style
    }} />
  );
};

export default Skeleton;
