import { type PointerEvent as ReactPointerEvent, useRef, useState } from 'react';
import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import type { SpectreCurveMode } from '../../state/tileReducer';
import type { Vec2 } from '../../geometry/Vec2';
import { Segmented } from '../ui/Segmented';

type ControlPoint = 'c1' | 'c2';
type ActiveDrag =
    | { kind: 'bezier'; point: ControlPoint; pointerId: number }
    | { kind: 'polyline'; pointIndex: number; pointerId: number };

const VIEW = { minX: -1, minY: -1.2, width: 3, height: 2.4 } as const;

function svgPoint(point: Vec2): Vec2 {
    return { x: point.x, y: -point.y };
}

function pointText(point: Vec2): string {
    return `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
}

function pointsText(points: readonly Vec2[]): string {
    return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function closestPointOnPolyline(
    points: readonly Vec2[],
    target: Vec2,
): { segmentIndex: number; point: Vec2 } | null {
    let closest: { segmentIndex: number; point: Vec2; distanceSquared: number } | null = null;

    for (let segmentIndex = 0; segmentIndex < points.length - 1; segmentIndex++) {
        const start = points[segmentIndex];
        const end = points[segmentIndex + 1];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSquared = dx * dx + dy * dy;
        const amount =
            lengthSquared === 0
                ? 0
                : Math.max(
                      0,
                      Math.min(
                          1,
                          ((target.x - start.x) * dx + (target.y - start.y) * dy) / lengthSquared,
                      ),
                  );
        const point = { x: start.x + amount * dx, y: start.y + amount * dy };
        const distanceSquared = (target.x - point.x) ** 2 + (target.y - point.y) ** 2;
        if (!closest || distanceSquared < closest.distanceSquared) {
            closest = { segmentIndex, point, distanceSquared };
        }
    }

    return closest && { segmentIndex: closest.segmentIndex, point: closest.point };
}

export function SpectreCurveEditor() {
    const { lang, spectreCurve, spectreCurveMode, spectrePolyline } = useTileState();
    const dispatch = useTileDispatch();
    const svgRef = useRef<SVGSVGElement>(null);
    const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
    const t = TRANSLATIONS[lang];

    const c1 = svgPoint(spectreCurve.c1);
    const c2 = svgPoint(spectreCurve.c2);
    const polylinePoints = spectrePolyline.points.map(svgPoint);
    const isBezier = spectreCurveMode === 'cubicBezier';
    const isPolyline = spectreCurveMode === 'polyline';
    const isEditable = isBezier || isPolyline;

    const eventPoint = (event: ReactPointerEvent): Vec2 | null => {
        const svg = svgRef.current;
        const matrix = svg?.getScreenCTM();
        if (!svg || !matrix) return null;
        const cursor = svg.createSVGPoint();
        cursor.x = event.clientX;
        cursor.y = event.clientY;
        return cursor.matrixTransform(matrix.inverse());
    };

    const finishDrag = (pointerId: number) => {
        if (activeDrag && activeDrag.pointerId !== pointerId) return;
        setActiveDrag(null);
    };

    const startBezierDrag = (point: ControlPoint, event: ReactPointerEvent<SVGCircleElement>) => {
        if (event.button !== 0) return;
        const svg = svgRef.current;
        if (!svg) return;
        event.preventDefault();
        event.stopPropagation();
        setActiveDrag({ kind: 'bezier', point, pointerId: event.pointerId });
    };

    const startPolylineDrag = (pointIndex: number, event: ReactPointerEvent<SVGCircleElement>) => {
        if (event.button !== 0) return;
        if (!svgRef.current) return;
        event.stopPropagation();
        setActiveDrag({ kind: 'polyline', pointIndex, pointerId: event.pointerId });
    };

    const addPolylinePoint = (event: ReactPointerEvent<SVGPolylineElement>) => {
        if (event.button !== 1) return;
        event.preventDefault();
        event.stopPropagation();
        const local = eventPoint(event);
        if (!local) return;
        const closest = closestPointOnPolyline(polylinePoints, local);
        if (!closest) return;
        dispatch({
            type: 'addSpectrePolylinePoint',
            segmentIndex: closest.segmentIndex,
            value: { x: closest.point.x, y: -closest.point.y },
        });
    };

    const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
        if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const outside =
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom;
        if (outside) {
            finishDrag(event.pointerId);
            return;
        }

        const local = eventPoint(event);
        if (!local) return;
        const value = { x: local.x, y: -local.y };

        if (activeDrag.kind === 'bezier') {
            dispatch({ type: 'setSpectreControlPoint', point: activeDrag.point, value });
        } else {
            dispatch({
                type: 'moveSpectrePolylinePoint',
                pointIndex: activeDrag.pointIndex,
                value,
            });
        }
    };

    return (
        <section className="curve-editor">
            <div className="curve-editor-heading">
                <div className="info-block-label">{t.spectreCurve}</div>
                {isEditable && (
                    <button
                        type="button"
                        className="btn curve-reset"
                        onClick={() => dispatch({ type: 'resetSpectreCurve' })}
                    >
                        {t.resetCurve}
                    </button>
                )}
            </div>

            <Segmented<SpectreCurveMode>
                name="spectre-curve-mode"
                value={spectreCurveMode}
                options={[
                    { value: 'straight', label: t.curveStraight },
                    { value: 'cubicBezier', label: t.curveBezier },
                    { value: 'polyline', label: t.curvePolyline },
                ]}
                onChange={(mode) => dispatch({ type: 'setSpectreCurveMode', mode })}
                containerStyle={{ width: '100%' }}
                optionStyle={{ flex: 1, justifyContent: 'center' }}
            />

            <svg
                ref={svgRef}
                className="curve-editor-svg"
                viewBox={`${VIEW.minX} ${VIEW.minY} ${VIEW.width} ${VIEW.height}`}
                onPointerMove={moveDrag}
                onPointerUp={(event) => finishDrag(event.pointerId)}
                onPointerCancel={(event) => finishDrag(event.pointerId)}
                onPointerLeave={() => setActiveDrag(null)}
                role="img"
                aria-label={t.spectreCurvePreview}
            >
                <line className="curve-editor-baseline" x1="0" y1="0" x2="1" y2="0" />
                {isBezier ? (
                    <>
                        <line className="curve-editor-guide" x1="0" y1="0" x2={c1.x} y2={c1.y} />
                        <line className="curve-editor-guide" x1="1" y1="0" x2={c2.x} y2={c2.y} />
                        <path
                            className="curve-editor-curve"
                            d={`M 0 0 C ${c1.x} ${c1.y} ${c2.x} ${c2.y} 1 0`}
                        />
                    </>
                ) : isPolyline ? (
                    <>
                        <polyline
                            className="curve-editor-curve"
                            points={pointsText(polylinePoints)}
                        />
                        <polyline
                            className="curve-editor-hit"
                            points={pointsText(polylinePoints)}
                            onPointerDown={addPolylinePoint}
                            onAuxClick={(event) => event.preventDefault()}
                        />
                    </>
                ) : (
                    <line className="curve-editor-curve" x1="0" y1="0" x2="1" y2="0" />
                )}
                <circle className="curve-editor-endpoint" cx="0" cy="0" r="0.025" />
                <circle className="curve-editor-endpoint" cx="1" cy="0" r="0.025" />
                {isBezier && (
                    <>
                        <circle
                            className={`curve-editor-handle${activeDrag?.kind === 'bezier' && activeDrag.point === 'c1' ? ' active' : ''}`}
                            cx={c1.x}
                            cy={c1.y}
                            r="0.055"
                            onPointerDown={(event) => startBezierDrag('c1', event)}
                        />
                        <circle
                            className={`curve-editor-handle${activeDrag?.kind === 'bezier' && activeDrag.point === 'c2' ? ' active' : ''}`}
                            cx={c2.x}
                            cy={c2.y}
                            r="0.055"
                            onPointerDown={(event) => startBezierDrag('c2', event)}
                        />
                    </>
                )}
                {isPolyline &&
                    polylinePoints.slice(1, -1).map((point, offset) => {
                        const pointIndex = offset + 1;
                        return (
                            // biome-ignore lint/a11y/useSemanticElements: the draggable control must remain an SVG shape
                            <circle
                                key={pointIndex}
                                className={`curve-editor-handle${activeDrag?.kind === 'polyline' && activeDrag.pointIndex === pointIndex ? ' active' : ''}`}
                                role="button"
                                tabIndex={0}
                                aria-label={`${t.polylineControlPoint} ${pointIndex}`}
                                cx={point.x}
                                cy={point.y}
                                r="0.055"
                                onPointerDown={(event) => startPolylineDrag(pointIndex, event)}
                                onDoubleClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    dispatch({ type: 'removeSpectrePolylinePoint', pointIndex });
                                }}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
                                    event.preventDefault();
                                    dispatch({ type: 'removeSpectrePolylinePoint', pointIndex });
                                }}
                            />
                        );
                    })}
            </svg>

            {isBezier && (
                <>
                    <div className="curve-editor-values">
                        <span>{`C1 ${pointText(spectreCurve.c1)}`}</span>
                        <span>{`C2 ${pointText(spectreCurve.c2)}`}</span>
                    </div>
                    <div className="curve-editor-hint">{t.dragControlPoints}</div>
                </>
            )}
            {isPolyline && <div className="curve-editor-hint">{t.editPolylinePoints}</div>}
        </section>
    );
}
