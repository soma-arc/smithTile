import { type PointerEvent as ReactPointerEvent, useId, useMemo, useRef, useState } from 'react';
import {
    type BoundarySegment,
    createSmithTile,
    smithTileBoundary,
    STRAIGHT_CURVE,
} from '../../geometry/smithTile';
import { IDENTITY_TRANSFORM } from '../../geometry/Transform';
import {
    localPointToPaint,
    type PaintPoint,
    paintPressureScale,
    type PaintTool,
    pointsBounds,
} from '../../geometry/tilePaint';
import type { Vec2 } from '../../geometry/Vec2';
import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import { Segmented } from '../ui/Segmented';

function mapSegment(segment: BoundarySegment, map: (point: Vec2) => Vec2): BoundarySegment {
    switch (segment.kind) {
        case 'line':
            return { kind: 'line', p0: map(segment.p0), p1: map(segment.p1) };
        case 'cubicBezier':
            return {
                kind: 'cubicBezier',
                p0: map(segment.p0),
                c1: map(segment.c1),
                c2: map(segment.c2),
                p1: map(segment.p1),
            };
        case 'polyline':
            return { kind: 'polyline', points: segment.points.map(map) };
    }
}

function pathData(segments: readonly BoundarySegment[]): string {
    const first = segments[0];
    if (!first) return '';
    const start = first.kind === 'polyline' ? first.points[0] : first.p0;
    if (!start) return '';
    const commands = [`M ${start.x} ${start.y}`];
    for (const segment of segments) {
        switch (segment.kind) {
            case 'line':
                commands.push(`L ${segment.p1.x} ${segment.p1.y}`);
                break;
            case 'cubicBezier':
                commands.push(
                    `C ${segment.c1.x} ${segment.c1.y} ${segment.c2.x} ${segment.c2.y} ${segment.p1.x} ${segment.p1.y}`,
                );
                break;
            case 'polyline':
                for (const point of segment.points.slice(1)) {
                    commands.push(`L ${point.x} ${point.y}`);
                }
                break;
        }
    }
    return `${commands.join(' ')} Z`;
}

function StrokeSegments({
    points,
    color,
    width,
    opacity = 1,
}: {
    points: readonly PaintPoint[];
    color: string;
    width: number;
    opacity?: number;
}) {
    return points.slice(1).map((point, index) => {
        const previous = points[index];
        const pressure =
            (paintPressureScale(previous.pressure) + paintPressureScale(point.pressure)) / 2;
        return (
            <line
                // biome-ignore lint/suspicious/noArrayIndexKey: points are immutable within a committed stroke
                key={index}
                className="paint-editor-stroke"
                x1={previous.x}
                y1={1 - previous.y}
                x2={point.x}
                y2={1 - point.y}
                stroke={color}
                strokeWidth={width * pressure}
                strokeOpacity={opacity}
            />
        );
    });
}

function rotateAroundCenter(point: Vec2, degrees: number): Vec2 {
    const radians = (degrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = point.x - 0.5;
    const dy = point.y - 0.5;
    return {
        x: 0.5 + dx * cos - dy * sin,
        y: 0.5 + dx * sin + dy * cos,
    };
}

export function TilePaintEditor() {
    const state = useTileState();
    const dispatch = useTileDispatch();
    const [draft, setDraft] = useState<readonly PaintPoint[]>([]);
    const activeRef = useRef<{
        pointerId: number;
        points: PaintPoint[];
        tool: PaintTool;
    } | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const clipId = `paint-editor-${useId().replace(/:/g, '')}`;
    const t = TRANSLATIONS[state.lang];

    const usesSpectre =
        state.shape.kind === 'spectre' ||
        ((state.shape.kind === 'articulatedWorm' || state.shape.kind === 'region') &&
            state.assemblyTileMode === 'spectre');
    const activeCurve =
        state.spectreCurveMode === 'straight'
            ? STRAIGHT_CURVE
            : state.spectreCurveMode === 'polyline'
              ? state.spectrePolyline
              : state.spectreCurve;
    const previewBoundary = useMemo(() => {
        const tile = createSmithTile(
            usesSpectre ? 1 : state.a,
            usesSpectre ? 1 : state.b,
            IDENTITY_TRANSFORM,
        );
        const localPoints = tile.shape.vertices.map((vertex) => vertex.position);
        const bounds = pointsBounds(localPoints);
        const normalize = (point: Vec2): Vec2 => {
            const normalized = localPointToPaint(point, bounds);
            return { x: normalized.x, y: 1 - normalized.y };
        };
        return smithTileBoundary(tile.shape, usesSpectre ? activeCurve : STRAIGHT_CURVE).map(
            (segment) => mapSegment(segment, normalize),
        );
    }, [activeCurve, state.a, state.b, usesSpectre]);

    const eventPoint = (event: ReactPointerEvent<SVGSVGElement>): PaintPoint | null => {
        const svg = svgRef.current;
        const matrix = svg?.getScreenCTM();
        if (!svg || !matrix) return null;
        const cursor = svg.createSVGPoint();
        cursor.x = event.clientX;
        cursor.y = event.clientY;
        const local = cursor.matrixTransform(matrix.inverse());
        // The preview group uses the opposite SVG rotation so positive angles
        // match the main camera's counterclockwise on-screen rotation. Undo that
        // view transform before storing the point in canonical paint coordinates.
        const unrotated = rotateAroundCenter(local, state.rotationDeg);
        return {
            x: Math.max(0, Math.min(1, unrotated.x)),
            y: Math.max(0, Math.min(1, 1 - unrotated.y)),
            pressure:
                event.pointerType === 'pen' ? Math.max(0, Math.min(1, event.pressure || 0.5)) : 1,
        };
    };

    const start = (event: ReactPointerEvent<SVGSVGElement>) => {
        const penEraser =
            event.pointerType === 'pen' && (event.button === 5 || (event.buttons & 32) !== 0);
        if (!event.isPrimary || (event.button !== 0 && !penEraser)) return;
        const point = eventPoint(event);
        if (!point) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const active = {
            pointerId: event.pointerId,
            points: [point],
            tool: penEraser ? ('eraser' as const) : state.paintTool,
        };
        activeRef.current = active;
        setDraft(active.points);
    };

    const move = (event: ReactPointerEvent<SVGSVGElement>) => {
        const active = activeRef.current;
        if (!active || active.pointerId !== event.pointerId) return;
        const point = eventPoint(event);
        if (!point) return;
        const previous = active.points[active.points.length - 1];
        if (Math.hypot(point.x - previous.x, point.y - previous.y) < 0.003) return;
        active.points = [...active.points, point];
        setDraft(active.points);
    };

    const finish = (event: ReactPointerEvent<SVGSVGElement>) => {
        const active = activeRef.current;
        if (!active || active.pointerId !== event.pointerId) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        if (active.points.length >= (active.tool === 'eraser' ? 1 : 2)) {
            dispatch(
                active.tool === 'eraser'
                    ? {
                          type: 'erasePaintPath',
                          points: active.points,
                          width: state.paintEraserWidth,
                      }
                    : {
                          type: 'addPaintStroke',
                          stroke: {
                              points: active.points,
                              color: state.paintColor,
                              width: state.paintWidth,
                              opacity: 1,
                          },
                      },
            );
        }
        activeRef.current = null;
        setDraft([]);
    };

    return (
        <section className="paint-editor">
            <div className="paint-editor-heading">
                <div className="info-block-label">{t.tilePaint}</div>
                <label className="paint-visible">
                    <input
                        type="checkbox"
                        checked={state.paint.visible}
                        onChange={(event) =>
                            dispatch({ type: 'setPaintVisible', visible: event.target.checked })
                        }
                    />
                    {t.paintVisible}
                </label>
            </div>
            <Segmented<PaintTool>
                name="paint-tool"
                value={state.paintTool}
                options={[
                    { value: 'brush', label: t.paintBrush },
                    { value: 'eraser', label: t.paintEraser },
                ]}
                onChange={(tool) => dispatch({ type: 'setPaintTool', tool })}
                containerStyle={{ width: '100%' }}
                optionStyle={{ flex: 1, justifyContent: 'center' }}
            />
            <svg
                ref={svgRef}
                className="paint-editor-svg"
                viewBox="-0.25 -0.25 1.5 1.5"
                role="img"
                aria-label={t.paintCanvas}
                onPointerDown={start}
                onPointerMove={move}
                onPointerUp={finish}
                onPointerCancel={finish}
                onContextMenu={(event) => event.preventDefault()}
            >
                <defs>
                    <clipPath id={clipId}>
                        <path d={pathData(previewBoundary)} />
                    </clipPath>
                </defs>
                <g
                    className="paint-editor-rotating"
                    transform={`rotate(${-state.rotationDeg} 0.5 0.5)`}
                >
                    <path
                        className="paint-editor-tile"
                        d={pathData(previewBoundary)}
                        fill={state.tileColor}
                    />
                    <g clipPath={`url(#${clipId})`}>
                        {state.paint.strokes.map((stroke, index) => (
                            <g
                                // biome-ignore lint/suspicious/noArrayIndexKey: strokes are append-only until undo/clear
                                key={index}
                            >
                                <StrokeSegments
                                    points={stroke.points}
                                    color={stroke.color}
                                    width={stroke.width}
                                    opacity={stroke.opacity}
                                />
                            </g>
                        ))}
                        {draft.length > 1 && (
                            <StrokeSegments
                                points={draft}
                                color={
                                    activeRef.current?.tool === 'eraser'
                                        ? state.tileColor
                                        : state.paintColor
                                }
                                width={
                                    activeRef.current?.tool === 'eraser'
                                        ? state.paintEraserWidth
                                        : state.paintWidth
                                }
                                opacity={activeRef.current?.tool === 'eraser' ? 0.75 : 1}
                            />
                        )}
                        {activeRef.current?.tool === 'eraser' && draft.length > 0 && (
                            <circle
                                className="paint-eraser-cursor"
                                cx={draft[draft.length - 1].x}
                                cy={1 - draft[draft.length - 1].y}
                                r={state.paintEraserWidth / 2}
                                fill={state.tileColor}
                                fillOpacity="0.75"
                            />
                        )}
                    </g>
                </g>
            </svg>
            <label className="paint-rotation-control">
                <span>{`${t.paintRotation} ${Math.round(state.rotationDeg)}°`}</span>
                <input
                    type="range"
                    aria-label={`${t.paintRotation} ${Math.round(state.rotationDeg)}°`}
                    min="0"
                    max="360"
                    step="1"
                    value={state.rotationDeg}
                    onChange={(event) =>
                        dispatch({ type: 'setRotation', deg: Number(event.target.value) })
                    }
                />
            </label>
            <div className="tile-color-control">
                <label>
                    <span>{t.tileColor}</span>
                    <input
                        type="color"
                        aria-label={t.tileColor}
                        value={state.tileColor}
                        onChange={(event) =>
                            dispatch({ type: 'setTileColor', color: event.target.value })
                        }
                    />
                </label>
            </div>
            <div className="paint-editor-controls">
                {state.paintTool === 'brush' && (
                    <label>
                        <span>{t.paintColor}</span>
                        <input
                            type="color"
                            aria-label={t.paintColor}
                            value={state.paintColor}
                            onChange={(event) =>
                                dispatch({ type: 'setPaintColor', color: event.target.value })
                            }
                        />
                    </label>
                )}
                <label className="paint-width-control">
                    <span>{state.paintTool === 'eraser' ? t.paintEraserWidth : t.paintWidth}</span>
                    <input
                        type="range"
                        aria-label={
                            state.paintTool === 'eraser' ? t.paintEraserWidth : t.paintWidth
                        }
                        min={state.paintTool === 'eraser' ? '0.01' : '0.005'}
                        max={state.paintTool === 'eraser' ? '0.25' : '0.12'}
                        step="0.005"
                        value={
                            state.paintTool === 'eraser' ? state.paintEraserWidth : state.paintWidth
                        }
                        onChange={(event) =>
                            dispatch({
                                type:
                                    state.paintTool === 'eraser'
                                        ? 'setPaintEraserWidth'
                                        : 'setPaintWidth',
                                width: Number(event.target.value),
                            })
                        }
                    />
                </label>
            </div>
            <div className="paint-editor-actions">
                <button
                    type="button"
                    className="btn"
                    disabled={state.paintHistory.length === 0}
                    onClick={() => dispatch({ type: 'undoPaintStroke' })}
                >
                    {t.paintUndo}
                </button>
                <button
                    type="button"
                    className="btn"
                    disabled={state.paint.strokes.length === 0}
                    onClick={() => dispatch({ type: 'clearPaint' })}
                >
                    {t.paintClear}
                </button>
            </div>
        </section>
    );
}
