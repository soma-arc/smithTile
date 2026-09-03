import { describe, expect, it } from 'vitest';
import { createSmithTile, PRESETS, polygonArea, smithTileWorldVertices } from '../geometry/smithTile';
import { IDENTITY_TRANSFORM } from '../geometry/Transform';
import type { Vec2 } from '../geometry/Vec2';
import { cleanPolygon } from './polygon2d';

/** The boundary of a preset tile at its natural placement. */
function presetPolygon(key: string): Vec2[] {
    const preset = PRESETS.find((p) => p.key === key);
    if (!preset) throw new Error(`unknown preset ${key}`);
    return smithTileWorldVertices(createSmithTile(preset.a, preset.b, IDENTITY_TRANSFORM));
}

/** Shoelace with its sign kept: positive means counterclockwise. */
function signedArea(points: readonly Vec2[]): number {
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const q = points[(i + 1) % points.length];
        sum += p.x * q.y - q.x * p.y;
    }
    return sum / 2;
}

describe('cleanPolygon', () => {
    it('drops the always-collinear vertex 9 from a generic tile', () => {
        // Edges 8 and 9 both point along +x, so vertex 9 is never a corner.
        expect(cleanPolygon(presetPolygon('hat'))).toHaveLength(13);
        expect(cleanPolygon(presetPolygon('t11'))).toHaveLength(13);
        expect(cleanPolygon(presetPolygon('turtle'))).toHaveLength(13);
        expect(cleanPolygon(presetPolygon('t41'))).toHaveLength(13);
        expect(cleanPolygon(presetPolygon('t14'))).toHaveLength(13);
    });

    it('collapses the degenerate presets, where one edge length is zero', () => {
        // Comet (1, 0) and Chevron (0, 1) have coincident vertices, not just
        // collinear ones: 14 raw points reduce to 7 and 6 real corners.
        expect(cleanPolygon(presetPolygon('comet'))).toHaveLength(7);
        expect(cleanPolygon(presetPolygon('chevron'))).toHaveLength(6);
    });

    it('leaves every remaining vertex a real corner', () => {
        for (const preset of PRESETS) {
            const points = cleanPolygon(presetPolygon(preset.key));
            for (let i = 0; i < points.length; i++) {
                const prev = points[(i + points.length - 1) % points.length];
                const here = points[i];
                const next = points[(i + 1) % points.length];
                const edge = Math.hypot(next.x - here.x, next.y - here.y);
                const turn =
                    (here.x - prev.x) * (next.y - here.y) - (here.y - prev.y) * (next.x - here.x);
                expect(edge, `${preset.key} edge ${i} has zero length`).toBeGreaterThan(1e-9);
                expect(Math.abs(turn), `${preset.key} vertex ${i} is collinear`).toBeGreaterThan(
                    1e-9,
                );
            }
        }
    });

    it('preserves area and counterclockwise winding', () => {
        for (const preset of PRESETS) {
            const raw = presetPolygon(preset.key);
            const cleaned = cleanPolygon(raw);
            expect(polygonArea(cleaned)).toBeCloseTo(polygonArea(raw), 9);
            expect(signedArea(cleaned), `${preset.key} is not counterclockwise`).toBeGreaterThan(0);
        }
    });

    it('rejects a polygon with fewer than 3 distinct corners', () => {
        const p = { x: 0, y: 0 };
        expect(() => cleanPolygon([p, p, p, p])).toThrow(RangeError);
        expect(() =>
            cleanPolygon([
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 2, y: 0 },
            ]),
        ).toThrow(RangeError);
    });
});
