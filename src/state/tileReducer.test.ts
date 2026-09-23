import { describe, expect, it } from 'vitest';
import { clampZoom, initialTileState, tileReducer } from './tileReducer';

describe('tileReducer — articulated worm mode', () => {
    it('selects E when entering the mode', () => {
        const state = tileReducer(initialTileState, {
            type: 'setShape',
            shape: 'articulatedWorm',
        });
        expect(state.shape).toEqual({ kind: 'articulatedWorm', worm: 'E' });
    });

    it('selects another articulated worm', () => {
        const state = tileReducer(initialTileState, {
            type: 'setArticulatedWorm',
            worm: 'I0:E',
        });
        expect(state.shape).toEqual({ kind: 'articulatedWorm', worm: 'I0:E' });
    });

    it('switches constituent tiles and recenters the drawing', () => {
        const state = tileReducer(
            {
                ...initialTileState,
                pan: { x: 12, y: -8 },
                regionAdjustments: {
                    1: { translation: { x: 2, y: 3 }, rotationRad: 0.2 },
                },
            },
            { type: 'setAssemblyTileMode', mode: 'spectre' },
        );

        expect(state.assemblyTileMode).toBe('spectre');
        expect(state.pan).toEqual({ x: 0, y: 0 });
        expect(state.regionAdjustments).toEqual({});
    });
});

describe('tileReducer — region mode', () => {
    it('opens partition workbenches in manual placement mode', () => {
        for (const region of ['PB2', 'TB2', 'TD2', 'PA2-TA2', 'TA2-TC2', 'TC2-PA1'] as const) {
            const state = tileReducer(
                {
                    ...initialTileState,
                    regionAdjustments: {
                        2: { translation: { x: 10, y: -5 }, rotationRad: 0.5 },
                    },
                },
                { type: 'setSpectreRegion', region },
            );

            expect(state.shape).toEqual({ kind: 'region', region });
            expect(state.regionPlacementMode).toBe('manual');
            expect(state.regionAdjustments).toEqual({});
        }
    });
});

describe('tileReducer — Spectre polyline editor', () => {
    it('adds, moves, and removes an interior control point', () => {
        const added = tileReducer(initialTileState, {
            type: 'addSpectrePolylinePoint',
            segmentIndex: 0,
            value: { x: 0.4, y: 0 },
        });
        expect(added.spectrePolyline.points).toEqual([
            { x: 0, y: 0 },
            { x: 0.4, y: 0 },
            { x: 1, y: 0 },
        ]);

        const moved = tileReducer(added, {
            type: 'moveSpectrePolylinePoint',
            pointIndex: 1,
            value: { x: 0.35, y: 0.2 },
        });
        expect(moved.spectrePolyline.points[1]).toEqual({ x: 0.35, y: 0.2 });

        const removed = tileReducer(moved, {
            type: 'removeSpectrePolylinePoint',
            pointIndex: 1,
        });
        expect(removed.spectrePolyline.points).toEqual([
            { x: 0, y: 0 },
            { x: 1, y: 0 },
        ]);
    });

    it('keeps both endpoint anchors fixed', () => {
        const movedStart = tileReducer(initialTileState, {
            type: 'moveSpectrePolylinePoint',
            pointIndex: 0,
            value: { x: -1, y: 1 },
        });
        const removedEnd = tileReducer(initialTileState, {
            type: 'removeSpectrePolylinePoint',
            pointIndex: 1,
        });

        expect(movedStart).toBe(initialTileState);
        expect(removedEnd).toBe(initialTileState);
    });

    it('resets only the selected polyline draft', () => {
        const edited = tileReducer(initialTileState, {
            type: 'addSpectrePolylinePoint',
            segmentIndex: 0,
            value: { x: 0.5, y: 0.25 },
        });
        const reset = tileReducer(
            { ...edited, spectreCurveMode: 'polyline' },
            { type: 'resetSpectreCurve' },
        );

        expect(reset.spectrePolyline.points).toEqual([
            { x: 0, y: 0 },
            { x: 1, y: 0 },
        ]);
        expect(reset.spectreCurve).toBe(initialTileState.spectreCurve);
    });
});

describe('tileReducer — tile paint', () => {
    const stroke = {
        points: [
            { x: 0.2, y: 0.3 },
            { x: 0.7, y: 0.8 },
        ],
        color: '#123456',
        width: 0.03,
        opacity: 1,
    } as const;

    it('adds, undoes, and clears committed strokes', () => {
        const added = tileReducer(initialTileState, { type: 'addPaintStroke', stroke });
        expect(added.paint.strokes).toEqual([stroke]);
        expect(tileReducer(added, { type: 'undoPaintStroke' }).paint.strokes).toEqual([]);
        expect(tileReducer(added, { type: 'clearPaint' }).paint.strokes).toEqual([]);
    });

    it('updates paint presentation settings and clamps brush width', () => {
        expect(
            tileReducer(initialTileState, { type: 'setPaintVisible', visible: false }).paint
                .visible,
        ).toBe(false);
        expect(
            tileReducer(initialTileState, { type: 'setPaintColor', color: '#abcdef' }).paintColor,
        ).toBe('#abcdef');
        expect(
            tileReducer(initialTileState, { type: 'setTileColor', color: '#fedcba' }).tileColor,
        ).toBe('#fedcba');
        expect(tileReducer(initialTileState, { type: 'setPaintWidth', width: 1 }).paintWidth).toBe(
            0.12,
        );
        expect(
            tileReducer(initialTileState, { type: 'setPaintEraserWidth', width: 1 })
                .paintEraserWidth,
        ).toBe(0.25);
        expect(
            tileReducer(initialTileState, { type: 'setPaintTool', tool: 'eraser' }).paintTool,
        ).toBe('eraser');
    });

    it('erases part of a stroke and restores it with undo', () => {
        const added = tileReducer(initialTileState, { type: 'addPaintStroke', stroke });
        const erased = tileReducer(added, {
            type: 'erasePaintPath',
            points: [
                { x: 0.45, y: 0 },
                { x: 0.45, y: 1 },
            ],
            width: 0.08,
        });
        expect(erased.paint.strokes).not.toEqual([stroke]);
        expect(tileReducer(erased, { type: 'undoPaintStroke' }).paint.strokes).toEqual([stroke]);
    });
});

describe('tileReducer — zoom and pan', () => {
    it('clamps zoom to the 0.05–10 range', () => {
        expect(clampZoom(100)).toBe(10);
        expect(clampZoom(0.01)).toBe(0.05);
        expect(clampZoom(4.5)).toBe(4.5);
    });

    it('moves the view by finite screen-space deltas', () => {
        const state = tileReducer(
            { ...initialTileState, pan: { x: 12, y: -4 } },
            { type: 'panBy', delta: { x: 8, y: 9 } },
        );
        expect(state.pan).toEqual({ x: 20, y: 5 });
    });

    it('recenters when the selected content changes', () => {
        const panned = { ...initialTileState, pan: { x: 40, y: -20 } };
        expect(tileReducer(panned, { type: 'setShape', shape: 'spectre' }).pan).toEqual({
            x: 0,
            y: 0,
        });
        expect(tileReducer(panned, { type: 'setSpectrePatch', patch: 'N0' }).pan).toEqual({
            x: 0,
            y: 0,
        });
        expect(tileReducer(panned, { type: 'setArticulatedWorm', worm: 'I0' }).pan).toEqual({
            x: 0,
            y: 0,
        });
    });
});
