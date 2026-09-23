import { geometries, measurements } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { describe, expect, it } from 'vitest';
import {
    createSmithTile,
    DEFAULT_SPECTRE_CURVE,
    PRESETS,
    polygonArea,
    smithTileWorldVertices,
} from '../geometry/smithTile';
import { IDENTITY_TRANSFORM } from '../geometry/Transform';
import { cleanPolygon } from './polygon2d';
import {
    DEFAULT_STL_OPTIONS,
    spectreOutline,
    spectreSolid,
    spectreStl,
    stlFilename,
    tileSolid,
    tileStl,
} from './stl';

/**
 * Every edge of a closed, orientable surface must be shared by exactly two
 * faces. Counting undirected edge uses is the strongest cheap check that the
 * caps of a concave polygon (the tile has 240° reflex corners) were triangulated
 * correctly — a wrong triangulation leaves holes or overlaps, which show up here
 * as edges used once or three-plus times.
 */
function nonManifoldEdges(solid: Geom3): string[] {
    const uses = new Map<string, number>();
    for (const polygon of geometries.geom3.toPolygons(solid)) {
        const vs = polygon.vertices;
        for (let i = 0; i < vs.length; i++) {
            const a = vs[i];
            const b = vs[(i + 1) % vs.length];
            // Round to a printable grid so shared corners hash identically, and
            // order the pair so the two adjacent faces agree on the key.
            const key = [a, b]
                .map((v) => v.map((c) => c.toFixed(6)).join(','))
                .sort()
                .join('|');
            uses.set(key, (uses.get(key) ?? 0) + 1);
        }
    }
    return [...uses.entries()].filter(([, n]) => n !== 2).map(([key, n]) => `${key} used ${n}x`);
}

describe('tileSolid', () => {
    it('is watertight for every preset', () => {
        for (const preset of PRESETS) {
            const solid = tileSolid(preset.a, preset.b, DEFAULT_STL_OPTIONS);
            expect(nonManifoldEdges(solid), `${preset.key} is not watertight`).toEqual([]);
        }
    });

    it('keeps a mirrored tile watertight', () => {
        const solid = tileSolid(1, Math.sqrt(3), {
            ...DEFAULT_STL_OPTIONS,
            mirrored: true,
        });
        expect(nonManifoldEdges(solid)).toEqual([]);
    });

    it('has the volume of its outline times the thickness', () => {
        const opts = { thickness: 4, unitMm: 10 };
        for (const preset of PRESETS) {
            const outline = cleanPolygon(
                smithTileWorldVertices(createSmithTile(preset.a, preset.b, IDENTITY_TRANSFORM)),
            );
            const expected = polygonArea(outline) * opts.unitMm ** 2 * opts.thickness;
            const actual = measurements.measureVolume(tileSolid(preset.a, preset.b, opts));
            expect(actual, `${preset.key} volume`).toBeCloseTo(expected, 6);
        }
    });

    it('is a slab of exactly the requested thickness, scaled by unitMm', () => {
        const opts = { thickness: 2.5, unitMm: 20 };
        const [min, max] = measurements.measureBoundingBox(tileSolid(1, Math.sqrt(3), opts));
        expect(min[2]).toBeCloseTo(0, 9);
        expect(max[2]).toBeCloseTo(opts.thickness, 9);

        // Doubling unitMm doubles the footprint but leaves the thickness alone.
        const [min1, max1] = measurements.measureBoundingBox(
            tileSolid(1, Math.sqrt(3), { ...opts, unitMm: 10 }),
        );
        expect(max[0] - min[0]).toBeCloseTo(2 * (max1[0] - min1[0]), 9);
        expect(max[1] - min[1]).toBeCloseTo(2 * (max1[1] - min1[1]), 9);
    });

    it('rejects an invalid (a, b)', () => {
        expect(() => tileSolid(0, 0, DEFAULT_STL_OPTIONS)).toThrow(RangeError);
        expect(() => tileSolid(-1, 1, DEFAULT_STL_OPTIONS)).toThrow(RangeError);
    });
});

describe('tileStl', () => {
    it('writes a binary STL whose header count matches its length', () => {
        const bytes = tileStl(1, Math.sqrt(3));
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const triangles = view.getUint32(80, true); // little-endian, per the STL spec
        expect(bytes.byteLength).toBe(84 + 50 * triangles);

        // A slab over an n-gon: two triangulated caps plus two triangles per side.
        const outline = cleanPolygon(
            smithTileWorldVertices(createSmithTile(1, Math.sqrt(3), IDENTITY_TRANSFORM)),
        );
        expect(triangles).toBe(4 * (outline.length - 1));
    });

    it('applies the default options and accepts overrides', () => {
        expect(tileStl(1, 1)).toEqual(tileStl(1, 1, DEFAULT_STL_OPTIONS));
        expect(tileStl(1, 1, { thickness: 8 })).not.toEqual(tileStl(1, 1));
    });
});

describe('Spectre STL', () => {
    const curved = {
        kind: 'cubicBezier' as const,
        c1: { x: 0.2, y: 0.12 },
        c2: { x: 0.8, y: 0.12 },
    };

    it('adaptively samples curved edges into a watertight slab', () => {
        const outline = spectreOutline(curved, 0.005);
        expect(outline.length).toBeGreaterThan(14);
        expect(nonManifoldEdges(spectreSolid(curved, DEFAULT_STL_OPTIONS))).toEqual([]);
    });

    it('supports straight-equivalent Bézier and polyline boundaries', () => {
        expect(nonManifoldEdges(spectreSolid(DEFAULT_SPECTRE_CURVE, DEFAULT_STL_OPTIONS))).toEqual(
            [],
        );
        expect(
            nonManifoldEdges(
                spectreSolid(
                    {
                        kind: 'polyline',
                        points: [
                            { x: 0, y: 0 },
                            { x: 0.5, y: 0.08 },
                            { x: 1, y: 0 },
                        ],
                    },
                    DEFAULT_STL_OPTIONS,
                ),
            ),
        ).toEqual([]);
    });

    it('serializes a binary STL with a consistent triangle count', () => {
        const bytes = spectreStl(curved);
        const triangles = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
            80,
            true,
        );
        expect(bytes.byteLength).toBe(84 + 50 * triangles);
    });
});

describe('stlFilename', () => {
    it('names the file after the parameters it was built from', () => {
        expect(stlFilename(1, 1)).toBe('tile-a1-b1.stl');
        expect(stlFilename(1, Math.sqrt(3))).toBe('tile-a1-b1.7321.stl');
        expect(stlFilename(1, 1, true)).toBe('tile-a1-b1-mirrored.stl');
    });
});
