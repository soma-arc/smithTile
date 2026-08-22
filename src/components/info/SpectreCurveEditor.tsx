import { type PointerEvent as ReactPointerEvent, useRef, useState } from 'react';
import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import type { SpectreCurveMode } from '../../state/tileReducer';
import type { Vec2 } from '../../Vec2';
import { Segmented } from '../ui/Segmented';

type ControlPoint = 'c1' | 'c2';
type ActiveDrag = { point: ControlPoint; pointerId: number };

const VIEW = { minX: -0.5, minY: -0.8, width: 2, height: 1.6 } as const;

function svgPoint(point: Vec2): Vec2 {
    return { x: point.x, y: -point.y };
}

function pointText(point: Vec2): string {
    return `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
}

export function SpectreCurveEditor() {
    const { lang, spectreCurve, spectreCurveMode } = useTileState();
    const dispatch = useTileDispatch();
    const svgRef = useRef<SVGSVGElement>(null);
    const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
    const t = TRANSLATIONS[lang];

    if (spectreCurve.kind !== 'cubicBezier') return null;

    const c1 = svgPoint(spectreCurve.c1);
    const c2 = svgPoint(spectreCurve.c2);
    const isBezier = spectreCurveMode === 'cubicBezier';

    const finishDrag = (pointerId: number) => {
        const svg = svgRef.current;
        if (svg?.hasPointerCapture(pointerId)) svg.releasePointerCapture(pointerId);
        setActiveDrag(null);
    };

    const startDrag = (point: ControlPoint, event: ReactPointerEvent<SVGCircleElement>) => {
        const svg = svgRef.current;
        if (!svg) return;
        event.preventDefault();
        svg.setPointerCapture(event.pointerId);
        setActiveDrag({ point, pointerId: event.pointerId });
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

        const matrix = event.currentTarget.getScreenCTM();
        if (!matrix) return;
        const cursor = event.currentTarget.createSVGPoint();
        cursor.x = event.clientX;
        cursor.y = event.clientY;
        const local = cursor.matrixTransform(matrix.inverse());

        dispatch({
            type: 'setSpectreControlPoint',
            point: activeDrag.point,
            value: { x: local.x, y: -local.y },
        });
    };

    return (
        <section className="curve-editor">
            <div className="curve-editor-heading">
                <div className="info-block-label">{t.spectreCurve}</div>
                {isBezier && (
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
                onLostPointerCapture={() => setActiveDrag(null)}
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
                ) : (
                    <line className="curve-editor-curve" x1="0" y1="0" x2="1" y2="0" />
                )}
                <circle className="curve-editor-endpoint" cx="0" cy="0" r="0.025" />
                <circle className="curve-editor-endpoint" cx="1" cy="0" r="0.025" />
                {isBezier && (
                    <>
                        <circle
                            className={`curve-editor-handle${activeDrag?.point === 'c1' ? ' active' : ''}`}
                            cx={c1.x}
                            cy={c1.y}
                            r="0.055"
                            onPointerDown={(event) => startDrag('c1', event)}
                        />
                        <circle
                            className={`curve-editor-handle${activeDrag?.point === 'c2' ? ' active' : ''}`}
                            cx={c2.x}
                            cy={c2.y}
                            r="0.055"
                            onPointerDown={(event) => startDrag('c2', event)}
                        />
                    </>
                )}
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
        </section>
    );
}
