import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage } from '@react-three/drei';

const Model = ({ url }: { url: string }) => {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
};

export const ModelViewer: React.FC<{ url: string }> = ({ url }) => {
    return (
        <div style={{ width: '100%', height: '100%', background: 'radial-gradient(circle at center, #1a1a24 0%, #0a0b10 100%)' }}>
            <Canvas shadows camera={{ position: [0, 0, 5], fov: 50 }}>
                <Suspense fallback={null}>
                    <Stage environment="city" intensity={0.6}>
                        <Model url={url} />
                    </Stage>
                </Suspense>
                <OrbitControls autoRotate enableZoom={true} />
            </Canvas>
        </div>
    );
};
