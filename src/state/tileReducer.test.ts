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
});

describe('tileReducer — region mode', () => {
    it('opens partition workbenches in manual placement mode', () => {
        for (const region of ['PB2', 'TB2', 'TD2'] as const) {
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
