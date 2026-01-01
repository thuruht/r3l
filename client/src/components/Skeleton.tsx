import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  marginBottom?: string;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = '20px', borderRadius = '4px', marginBottom = '10px', style }) => {
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
