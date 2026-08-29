import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { useScene } from '../../hooks/useScene';
import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { CanvasBackend } from '../../render/backends/CanvasBackend';
import { SvgBackend } from '../../render/backends/SvgBackend';

export type Backend = 'svg' | 'canvas';

/** Wheel notch → zoom multiplier. One notch (deltaY ≈ 100) scales by ~10%. */
const WHEEL_ZOOM_SENSITIVITY = 0.001;

type ActivePan = { pointerId: number; clientX: number; clientY: number };

/** Convert a client-pixel drag through the backends' uniform contain scaling. */
export function clientDeltaToSceneDelta(
    dx: number,
    dy: number,
    hostWidth: number,
    hostHeight: number,
    viewBox: readonly [number, number, number, number],
) {
    const [, , sceneWidth, sceneHeight] = viewBox;
    const scale = Math.min(hostWidth / sceneWidth, hostHeight / sceneHeight);
    if (!(scale > 0) || !Number.isFinite(scale)) return { x: 0, y: 0 };
    return { x: dx / scale, y: dy / scale };
}

/** Draws the current tile through the chosen (swappable) render backend. */
export function TileView({ backend = 'svg' }: { backend?: Backend }) {
    const state = useTileState();
    const dispatch = useTileDispatch();
    const scene = useScene(state);
    const hostRef = useRef<HTMLDivElement>(null);
    const activePanRef = useRef<ActivePan | null>(null);
    const [dragging, setDragging] = useState(false);
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

    const finishPan = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (activePanRef.current?.pointerId !== event.pointerId) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        activePanRef.current = null;
        setDragging(false);
    };

    const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!event.isPrimary || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        activePanRef.current = {
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
        };
        setDragging(true);
    };

    const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
        const active = activePanRef.current;
        if (!active || active.pointerId !== event.pointerId) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const delta = clientDeltaToSceneDelta(
            event.clientX - active.clientX,
            event.clientY - active.clientY,
            rect.width,
            rect.height,
            scene.viewBox,
        );
        active.clientX = event.clientX;
        active.clientY = event.clientY;
        dispatch({ type: 'panBy', delta });
    };

    return (
        <div
            ref={hostRef}
            data-testid="tile-view-host"
            onPointerDown={startPan}
            onPointerMove={movePan}
            onPointerUp={finishPan}
            onPointerCancel={finishPan}
            style={{
                width: '100%',
                height: '100%',
                cursor: dragging ? 'grabbing' : 'grab',
                touchAction: 'none',
                userSelect: 'none',
            }}
        >
            {backend === 'canvas' ? <CanvasBackend scene={scene} /> : <SvgBackend scene={scene} />}
        </div>
    );
}
