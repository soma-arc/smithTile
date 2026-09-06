import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { useScene } from '../../hooks/useScene';
import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { CanvasBackend } from '../../render/backends/CanvasBackend';
import { SvgBackend } from '../../render/backends/SvgBackend';
import { screenDeltaToWorldDelta } from '../../render/camera';
import type { Vec2 } from '../../geometry/Vec2';

export type Backend = 'svg' | 'canvas';

/** Wheel notch → zoom multiplier. One notch (deltaY ≈ 100) scales by ~10%. */
const WHEEL_ZOOM_SENSITIVITY = 0.001;

type ActiveDrag =
    | { kind: 'pan'; pointerId: number; clientX: number; clientY: number }
    | {
          kind: 'moveRegion';
          pointerId: number;
          wormIndex: number;
          clientX: number;
          clientY: number;
      }
    | { kind: 'rotateRegion'; pointerId: number; wormIndex: number; angle: number };

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

function clientPointToScenePoint(
    clientX: number,
    clientY: number,
    rect: DOMRect,
    viewBox: readonly [number, number, number, number],
): Vec2 {
    const [minX, minY, sceneWidth, sceneHeight] = viewBox;
    const scale = Math.min(rect.width / sceneWidth, rect.height / sceneHeight);
    const drawnWidth = sceneWidth * scale;
    const drawnHeight = sceneHeight * scale;
    return {
        x: minX + (clientX - rect.left - (rect.width - drawnWidth) / 2) / scale,
        y: minY + (clientY - rect.top - (rect.height - drawnHeight) / 2) / scale,
    };
}

function pointInPolygon(point: Vec2, polygon: readonly Vec2[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i];
        const b = polygon[j];
        if (
            a.y > point.y !== b.y > point.y &&
            point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
        ) {
            inside = !inside;
        }
    }
    return inside;
}

function angleDelta(from: number, to: number): number {
    let delta = to - from;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return delta;
}

/** Draws the current tile through the chosen (swappable) render backend. */
export function TileView({ backend = 'svg' }: { backend?: Backend }) {
    const state = useTileState();
    const dispatch = useTileDispatch();
    const scene = useScene(state);
    const hostRef = useRef<HTMLDivElement>(null);
    const activeDragRef = useRef<ActiveDrag | null>(null);
    const [dragging, setDragging] = useState<ActiveDrag['kind'] | null>(null);
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

    const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (activeDragRef.current?.pointerId !== event.pointerId) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        activeDragRef.current = null;
        setDragging(null);
    };

    const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!event.isPrimary || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const interaction = scene.interaction;
        const point = clientPointToScenePoint(
            event.clientX,
            event.clientY,
            event.currentTarget.getBoundingClientRect(),
            scene.viewBox,
        );
        const targets = interaction ? [...interaction.targets].reverse() : [];
        const handleTarget = targets.find(
            (target) =>
                Math.hypot(point.x - target.rotationHandle.x, point.y - target.rotationHandle.y) <=
                16,
        );
        if (handleTarget) {
            activeDragRef.current = {
                kind: 'rotateRegion',
                pointerId: event.pointerId,
                wormIndex: handleTarget.wormIndex,
                angle: Math.atan2(
                    point.y - handleTarget.rotationCenter.y,
                    point.x - handleTarget.rotationCenter.x,
                ),
            };
            setDragging('rotateRegion');
            return;
        }
        const moveTarget = targets.find((target) =>
            target.movablePolygons.some((polygon) => pointInPolygon(point, polygon)),
        );
        activeDragRef.current = moveTarget
            ? {
                  kind: 'moveRegion',
                  pointerId: event.pointerId,
                  wormIndex: moveTarget.wormIndex,
                  clientX: event.clientX,
                  clientY: event.clientY,
              }
            : {
                  kind: 'pan',
                  pointerId: event.pointerId,
                  clientX: event.clientX,
                  clientY: event.clientY,
              };
        setDragging(moveTarget ? 'moveRegion' : 'pan');
    };

    const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        const active = activeDragRef.current;
        if (!active || active.pointerId !== event.pointerId) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        if (active.kind === 'rotateRegion') {
            const interaction = scene.interaction;
            if (!interaction) return;
            const target = interaction.targets.find(
                (candidate) => candidate.wormIndex === active.wormIndex,
            );
            if (!target) return;
            const point = clientPointToScenePoint(
                event.clientX,
                event.clientY,
                rect,
                scene.viewBox,
            );
            const angle = Math.atan2(
                point.y - target.rotationCenter.y,
                point.x - target.rotationCenter.x,
            );
            dispatch({
                type: 'rotateRegionWorm',
                wormIndex: active.wormIndex,
                deltaRad: -angleDelta(active.angle, angle),
            });
            active.angle = angle;
            return;
        }
        const delta = clientDeltaToSceneDelta(
            event.clientX - active.clientX,
            event.clientY - active.clientY,
            rect.width,
            rect.height,
            scene.viewBox,
        );
        active.clientX = event.clientX;
        active.clientY = event.clientY;
        dispatch(
            active.kind === 'moveRegion'
                ? {
                      type: 'moveRegionWorm',
                      wormIndex: active.wormIndex,
                      delta: screenDeltaToWorldDelta(delta, state.zoom, state.rotationDeg),
                  }
                : { type: 'panBy', delta },
        );
    };

    return (
        <div
            ref={hostRef}
            data-testid="tile-view-host"
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            style={{
                width: '100%',
                height: '100%',
                cursor:
                    dragging === 'pan' || dragging === 'rotateRegion'
                        ? 'grabbing'
                        : dragging === 'moveRegion'
                          ? 'move'
                          : 'grab',
                touchAction: 'none',
                userSelect: 'none',
            }}
        >
            {backend === 'canvas' ? <CanvasBackend scene={scene} /> : <SvgBackend scene={scene} />}
        </div>
    );
}
