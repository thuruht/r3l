import React, { Suspense, useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, useGLTF, Stage } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import * as THREE from 'three';

function isFormat(url: string, ...exts: string[]): boolean {
  const match = url.match(/\.(\w+)(\?|$)/);
  return match ? exts.includes(match[1].toLowerCase()) : false;
}

const DEFAULT_MAT = new THREE.MeshStandardMaterial({
  color: 0x26de81,
  metalness: 0.3,
  roughness: 0.6,
});

const Model = ({ url }: { url: string }) => {
  if (isFormat(url, 'stl')) {
    const geom = useLoader(STLLoader, url);
    const mat = useMemo(() => DEFAULT_MAT.clone(), []);
    return <mesh geometry={geom} material={mat} />;
  }

  if (isFormat(url, 'ply')) {
    const geom = useLoader(PLYLoader, url);
    const mat = useMemo(() => DEFAULT_MAT.clone(), []);
    return <mesh geometry={geom} material={mat} />;
  }

  if (isFormat(url, 'obj')) {
    const obj = useLoader(OBJLoader, url);
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = DEFAULT_MAT.clone();
      }
    });
    return <primitive object={obj} />;
  }

  if (isFormat(url, 'fbx')) {
    const obj = useLoader(FBXLoader, url);
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = DEFAULT_MAT.clone();
      }
    });
    // Center and scale FBX
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = 5 / maxDim;
      obj.scale.setScalar(scale);
    }
    return <primitive object={obj} />;
  }

  if (isFormat(url, '3mf')) {
    const obj = useLoader(ThreeMFLoader, url);
    // ThreeMFLoader returns a Group with materials already applied
    return <primitive object={obj} />;
  }

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
