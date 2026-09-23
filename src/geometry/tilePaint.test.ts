import { describe, expect, it } from 'vitest';
import {
    erasePaintStrokes,
    localPointToPaint,
    paintFrameSize,
    paintPointToLocal,
    paintPressureScale,
} from './tilePaint';

const WIDE_BOUNDS = { minX: 10, minY: 20, width: 4, height: 2 };

describe('tile paint coordinate frame', () => {
    it('uses one scale for both axes and centers the shorter dimension', () => {
        expect(paintFrameSize(WIDE_BOUNDS)).toBe(4);
        expect(localPointToPaint({ x: 10, y: 20 }, WIDE_BOUNDS)).toEqual({ x: 0, y: 0.25 });
        expect(localPointToPaint({ x: 14, y: 22 }, WIDE_BOUNDS)).toEqual({ x: 1, y: 0.75 });

        const center = paintPointToLocal({ x: 0.5, y: 0.5 }, WIDE_BOUNDS);
        const alongX = paintPointToLocal({ x: 0.6, y: 0.5 }, WIDE_BOUNDS);
        const alongY = paintPointToLocal({ x: 0.5, y: 0.6 }, WIDE_BOUNDS);
        expect(alongX.x - center.x).toBeCloseTo(alongY.y - center.y, 12);
    });

    it('round-trips between paint and local coordinates', () => {
        const point = { x: 0.17, y: 0.83 };
        const roundTrip = localPointToPaint(paintPointToLocal(point, WIDE_BOUNDS), WIDE_BOUNDS);
        expect(roundTrip.x).toBeCloseTo(point.x, 12);
        expect(roundTrip.y).toBeCloseTo(point.y, 12);
    });

    it('keeps light stylus contact visible and clamps pressure', () => {
        expect(paintPressureScale(0)).toBe(0.25);
        expect(paintPressureScale(1)).toBe(1);
        expect(paintPressureScale(-1)).toBe(0.25);
        expect(paintPressureScale(2)).toBe(1);
        expect(paintPressureScale(undefined)).toBe(1);
    });
});

describe('erasePaintStrokes', () => {
    const stroke = {
        points: [
            { x: 0.1, y: 0.5 },
            { x: 0.9, y: 0.5 },
        ],
        color: '#123456',
        width: 0.02,
        opacity: 1,
    };

    it('splits a stroke around the portion crossed by the eraser', () => {
        const erased = erasePaintStrokes(
            [stroke],
            [
                { x: 0.5, y: 0.3 },
                { x: 0.5, y: 0.7 },
            ],
            0.08,
        );

        expect(erased).toHaveLength(2);
        expect(erased.every((fragment) => fragment.color === stroke.color)).toBe(true);
        expect(erased[0].points[erased[0].points.length - 1].x).toBeLessThan(0.5);
        expect(erased[1].points[0].x).toBeGreaterThan(0.5);
    });

    it('preserves untouched strokes without resampling them', () => {
        const result = erasePaintStrokes([stroke], [{ x: 0.5, y: 0.9 }], 0.02);
        expect(result[0]).toBe(stroke);
    });
});
