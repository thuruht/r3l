import { useEffect, useRef } from 'react';
import { NetworkNode } from './useNetworkData';

export const useSpatialAudio = (isDrifting: boolean) => {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const sourcesRef = useRef<Map<string, { panner: PannerNode, osc: OscillatorNode, gain: GainNode }>>(new Map());

    // Init Audio Context on first interaction
    useEffect(() => {
        const initAudio = () => {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            if (audioCtxRef.current.state === 'suspended') {
                audioCtxRef.current.resume();
            }
            window.removeEventListener('click', initAudio);
            window.removeEventListener('keydown', initAudio);
        };
        window.addEventListener('click', initAudio);
        window.addEventListener('keydown', initAudio);
        return () => {
            window.removeEventListener('click', initAudio);
            window.removeEventListener('keydown', initAudio);
        };
    }, []);

    // Cleanup on unmount or drift stop
    useEffect(() => {
        if (!isDrifting) {
            sourcesRef.current.forEach(s => {
                try {
                    s.osc.stop();
                    s.osc.disconnect();
                    s.panner.disconnect();
                    s.gain.disconnect();
                } catch(e) {}
            });
            sourcesRef.current.clear();
        }
    }, [isDrifting]);

    const updateAudioPositions = (d3Nodes: any[]) => {
        if (!audioCtxRef.current || !isDrifting) return;
        if (audioCtxRef.current.state === 'suspended') return;

        const ctx = audioCtxRef.current;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const listener = ctx.listener;

        // Ensure listener is centered (where "Me" usually is, or just screen center)
        if (listener.positionX) {
             listener.positionX.value = width / 2;
             listener.positionY.value = height / 2;
             listener.positionZ.value = 50; 
        } else {
             listener.setPosition(width / 2, height / 2, 50);
        }

        // Filter for drift nodes
        // Only process nodes that are visibly drift nodes
        const driftNodes = d3Nodes.filter(n => n.group && n.group.startsWith('drift'));

        // Cleanup missing nodes
        const currentIds = new Set(driftNodes.map(n => n.id));
        sourcesRef.current.forEach((val, key) => {
            if (!currentIds.has(key)) {
                try {
                    val.osc.stop();
                    val.osc.disconnect();
                    val.panner.disconnect();
                    val.gain.disconnect();
                } catch(e) {}
                sourcesRef.current.delete(key);
            }
        });

        // Update or Create
        driftNodes.forEach(node => {
            // Safety check for NaN coordinates
            if (isNaN(node.x) || isNaN(node.y)) return;

            if (!sourcesRef.current.has(node.id)) {
                // Create
                const panner = ctx.createPanner();
                panner.panningModel = 'HRTF';
                panner.distanceModel = 'exponential';
                panner.refDistance = 150;
                panner.maxDistance = 2000;
                panner.rolloffFactor = 1.5;

                const osc = ctx.createOscillator();
                // Random pitch based on ID hash or type
                // drift_file: higher, sine (e.g., 300-600Hz)
                // drift_user: lower, triangle (e.g., 100-300Hz)
                const isFile = node.group === 'drift_file';
                osc.type = isFile ? 'sine' : 'triangle';
                
                // Simple pseudo-random based on ID length or char code to keep it consistent-ish
                const seed = node.id.charCodeAt(node.id.length - 1);
                const baseFreq = isFile ? 300 : 100;
                osc.frequency.value = baseFreq + (seed % 200);

                const gain = ctx.createGain();
                // Very quiet, ambient
                gain.gain.value = 0.02; 

                // LFO for "pulsing" feel? Maybe too complex. Keep it simple drone.

                osc.connect(gain).connect(panner).connect(ctx.destination);
                osc.start();

                sourcesRef.current.set(node.id, { panner, osc, gain });
            }

            // Update Position
            const source = sourcesRef.current.get(node.id)!;
            
            // Spatial Audio Logic
            if (source.panner.positionX) {
                source.panner.positionX.value = node.x;
                source.panner.positionY.value = node.y;
                source.panner.positionZ.value = 0;
            } else {
                source.panner.setPosition(node.x, node.y, 0);
            }
        });
    };

    return { updateAudioPositions };
};
