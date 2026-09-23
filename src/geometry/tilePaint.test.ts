import { describe, expect, it } from 'vitest';
import {
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
