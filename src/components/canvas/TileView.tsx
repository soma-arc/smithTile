import { useEffect, useRef } from 'react';
import { useScene } from '../../hooks/useScene';
import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { CanvasBackend } from '../../render/backends/CanvasBackend';
import { SvgBackend } from '../../render/backends/SvgBackend';

export type Backend = 'svg' | 'canvas';

/** Wheel notch → zoom multiplier. One notch (deltaY ≈ 100) scales by ~10%. */
const WHEEL_ZOOM_SENSITIVITY = 0.001;

/** Draws the current tile through the chosen (swappable) render backend. */
export function TileView({ backend = 'svg' }: { backend?: Backend }) {
    const state = useTileState();
    const dispatch = useTileDispatch();
    const scene = useScene(state);
    const hostRef = useRef<HTMLDivElement>(null);
    const zoomRef = useRef(state.zoom);
    zoomRef.current = state.zoom;

    // Native (non-passive) wheel listener so we can preventDefault the page
    // scroll; React's synthetic onWheel is passive and cannot.
    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENSITIVITY);
            dispatch({ type: 'setZoom', zoom: zoomRef.current * factor });
        };
        host.addEventListener('wheel', onWheel, { passive: false });
        return () => host.removeEventListener('wheel', onWheel);
    }, [dispatch]);

    return (
        <div ref={hostRef} style={{ width: '100%', height: '100%' }}>
            {backend === 'canvas' ? <CanvasBackend scene={scene} /> : <SvgBackend scene={scene} />}
        </div>
    );
}
