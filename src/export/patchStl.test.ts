import { geometries, measurements } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { describe, expect, it } from 'vitest';
import { SPECTRE_PATCHES } from '../geometry/smithPatch';
import { createSmithTile, PRESETS, smithTileWorldVertices } from '../geometry/smithTile';
import { getSpectreWrigglyPatch } from '../geometry/spectreWrigglyPatch';
import { createReflectionTransform, IDENTITY_TRANSFORM } from '../geometry/Transform';
import { getTileArticulatedPatch } from '../geometry/tileArticulatedPatch';
import { getTileWrigglyPatch } from '../geometry/tileWrigglyPatch';
import { ccwPolygon, insetPolygon } from './insetPolygon';
import { beveledSolid, patchSolid, patchSolids, patchStl } from './patchStl';
import { PatchStlValidationError } from './patchStlError';

function expectClosed(solid: Geom3, label = '') {
    const edges = new Map<string, { count: number; balance: number }>();
    for (const face of geometries.geom3.toPolygons(solid)) {
        expect(
            measurements.measureArea(geometries.geom3.create([face])),
            `${label}: ${JSON.stringify(face.vertices)}`,
        ).toBeGreaterThan(1e-9);
        for (let i = 0; i < face.vertices.length; i++) {
            const a = face.vertices[i].map((v) => Number(v.toFixed(6))).join(',');
            const b = face.vertices[(i + 1) % face.vertices.length]
                .map((v) => Number(v.toFixed(6)))
                .join(',');
            const key = [a, b].sort().join('|');
            const use = edges.get(key) ?? { count: 0, balance: 0 };
            edges.set(key, { count: use.count + 1, balance: use.balance + (a < b ? 1 : -1) });
        }
    }
    expect(
        [...edges.entries()].filter(([, use]) => use.count !== 2 || use.balance !== 0),
        label,
    ).toEqual([]);
    expect(measurements.measureVolume(solid)).toBeGreaterThan(0);
}

function readStl(bytes: Uint8Array<ArrayBuffer>): Geom3 {
    const count = new DataView(bytes.buffer).getUint32(80, true);
    const view = new DataView(bytes.buffer);
    const triangles = Array.from({ length: count }, (_, i) =>
        geometries.poly3.fromPoints(
            Array.from({ length: 3 }, (_, j): [number, number, number] => {
                const start = 84 + i * 50 + 12 + j * 12;
                return [0, 4, 8].map((offset) => view.getFloat32(start + offset, true)) as [
                    number,
                    number,
                    number,
                ];
            }),
        ),
    );
    return geometries.geom3.create(triangles);
}

describe('constant-width inset', () => {
    it('moves every edge inward by the requested distance, including concave corners', () => {
        const bottom = ccwPolygon(
            smithTileWorldVertices(createSmithTile(1, 1, IDENTITY_TRANSFORM)),
        );
        const top = insetPolygon(bottom, 0.08);
        for (let i = 0; i < bottom.length; i++) {
            const a = bottom[i];
            const b = bottom[(i + 1) % bottom.length];
            for (const p of [top[i], top[(i + 1) % top.length]]) {
                const distance =
                    ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) /
                    Math.hypot(b.x - a.x, b.y - a.y);
                expect(distance).toBeCloseTo(0.08, 9);
            }
        }
    });

    it('rejects collapse even when the final polygon becomes simple again', () => {
        const square = ccwPolygon([
            { x: 0, y: 0 },
            { x: 2, y: 0 },
            { x: 2, y: 2 },
            { x: 0, y: 2 },
        ]);
        expect(() => insetPolygon(square, 1)).toThrow(RangeError);
        expect(() => insetPolygon(square, 2)).toThrow(RangeError);
    });

    it('rejects a concave neck splitting before any edge reverses', () => {
        const neck = ccwPolygon(
            [
                [0, 0],
                [4, 0],
                [4, 1],
                [8, 1],
                [8, 0],
                [12, 0],
                [12, 6],
                [8, 6],
                [8, 3],
                [4, 3],
                [4, 6],
                [0, 6],
            ].map(([x, y]) => ({ x, y })),
        );
        expect(() => insetPolygon(neck, 0.8)).not.toThrow();
        expect(() => insetPolygon(neck, 1)).toThrow(RangeError);
        expect(() => insetPolygon(neck, 1.1)).toThrow(RangeError);
    });
});

describe('beveled patch STL', () => {
    const curved = {
        kind: 'cubicBezier' as const,
        c1: { x: 0.2, y: 0.12 },
        c2: { x: 0.8, y: 0.12 },
    };

    it('exports a closed curved Spectre Wriggly I1 after recursion', () => {
        const patch = getSpectreWrigglyPatch('I', 1, true);
        expectClosed(readStl(patchStl(patch, { edgeCurve: curved })), 'I1 mirrored');
    });

    it.each([
        ['Hat', 1, Math.sqrt(3)],
        ['Turtle', Math.sqrt(3), 1],
        ['Tile(2, 3)', 2, 3],
    ] as const)('exports closed Wriggly %s meshes with shared faces removed', (name, a, b) => {
        for (const kind of ['B', 'C', 'S'] as const) {
            const patch = getTileWrigglyPatch(a, b, kind, 1, true);
            for (const bevel of [0, 0.8]) {
                expectClosed(readStl(patchStl(patch, { bevel })), `${name} ${kind}1`);
            }
        }
    });

    it.each(['I', 'S', 'N', 'Aa', 'Ab'] as const)(
        'exports a closed curved Wriggly Spectre %s0',
        (kind) => {
            for (const mirrored of [false, true]) {
                const patch = getSpectreWrigglyPatch(kind, 0, mirrored);
                expectClosed(
                    readStl(patchStl(patch, { edgeCurve: curved })),
                    `${kind}0 ${mirrored}`,
                );
            }
        },
    );

    it.each([
        ['hat', 1, Math.sqrt(3)],
        ['turtle', Math.sqrt(3), 1],
        ['Tile(2, 3)', 2, 3],
    ] as const)('exports closed %s B/C patches including reflected tiles', (name, a, b) => {
        for (const kind of ['B', 'C'] as const) {
            for (const mirrored of [false, true]) {
                for (const level of [1, 2]) {
                    const patch = getTileArticulatedPatch(a, b, kind, level, mirrored);
                    for (const bevel of [0, 0.8]) {
                        expectClosed(
                            readStl(patchStl(patch, { bevel })),
                            `${name} ${kind}${level} ${mirrored}`,
                        );
                    }
                }
            }
        }
    });

    it('makes closed, consistently oriented solids for presets and reflected tiles', () => {
        for (const preset of PRESETS) {
            for (const transform of [IDENTITY_TRANSFORM, createReflectionTransform()]) {
                const points = smithTileWorldVertices(
                    createSmithTile(preset.a, preset.b, transform),
                ).map((p) => ({ x: p.x * 10, y: p.y * 10 }));
                expectClosed(beveledSolid(points, 4, 0.8), preset.key);
            }
        }
    });

    it('preserves every patch tile footprint, placement and the requested heights', () => {
        const patch = SPECTRE_PATCHES.Ma0;
        const solids = patchSolids(patch);
        expect(solids).toHaveLength(patch.tiles.length);
        solids.forEach((solid, i) => {
            const expected = ccwPolygon(
                smithTileWorldVertices(patch.tiles[i]).map((p) => ({ x: p.x * 10, y: p.y * 10 })),
            );
            const vertices = geometries.geom3.toPolygons(solid).flatMap((p) => p.vertices);
            const key = (p: readonly number[]) =>
                p
                    .slice(0, 2)
                    .map((n) => n.toFixed(6))
                    .join(',');
            expect(new Set(vertices.filter((p) => p[2] === 0).map(key))).toEqual(
                new Set(expected.map((p) => key([p.x, p.y]))),
            );
            expect(new Set(vertices.map((p) => p[2]))).toEqual(new Set([0, 3.2, 4]));
            expectClosed(solid);
        });
    });

    it('has the analytical volume of a square with a 45-degree top bevel', () => {
        const square = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
        ];
        // Integral of (10-2d)^2 for d=0..1, plus the 3mm straight slab.
        expect(measurements.measureVolume(beveledSolid(square, 4, 1))).toBeCloseTo(
            300 + 100 - 20 + 4 / 3,
            8,
        );
        expect(measurements.measureVolume(beveledSolid(square, 4, 0))).toBeCloseTo(400, 8);
    });

    it('removes contact faces without changing total volume and serializes the whole patch', () => {
        const patch = SPECTRE_PATCHES.Ma0;
        const total = patchSolids(patch).reduce(
            (sum, solid) => sum + measurements.measureVolume(solid),
            0,
        );
        expect(measurements.measureVolume(patchSolid(patch))).toBeCloseTo(total, 5);
        const bytes = patchStl(patch);
        const count = new DataView(bytes.buffer).getUint32(80, true);
        expect(count).toBeGreaterThan(0);
        expect(bytes.length).toBe(84 + 50 * count);
        expectClosed(readStl(bytes), 'serialized patch');
    });

    it.each(['N0', 'Mb0', 'I1'] as const)(
        'writes a closed mesh for %s with and without a bevel',
        (key) => {
            for (const bevel of [0, 0.8]) {
                expectClosed(readStl(patchStl(SPECTRE_PATCHES[key], { bevel })), key);
            }
        },
    );

    it('writes a closed patch with shared cubic Bezier edges', () => {
        for (const bevel of [0, 0.8]) {
            expectClosed(
                readStl(patchStl(SPECTRE_PATCHES.Ma0, { bevel, edgeCurve: curved })),
                `curved bevel=${bevel}`,
            );
        }
    });

    it('adds triangles when the curve tolerance is tightened', () => {
        const triangleCount = (curveToleranceMm: number) =>
            new DataView(
                patchStl(SPECTRE_PATCHES.Ma0, {
                    bevel: 0,
                    edgeCurve: curved,
                    curveToleranceMm,
                }).buffer,
            ).getUint32(80, true);
        expect(triangleCount(0.01)).toBeGreaterThan(triangleCount(0.2));
    });

    it('reports when the bevel is too wide for a finely sampled curve', () => {
        try {
            patchStl(SPECTRE_PATCHES.Ma0, {
                edgeCurve: curved,
                curveToleranceMm: 0.01,
            });
            throw new Error('Expected patchStl to reject the bevel');
        } catch (error) {
            expect(error).toBeInstanceOf(PatchStlValidationError);
            expect((error as PatchStlValidationError).code).toBe('bevelGeometry');
        }
    });

    it('rejects empty patches, nonfinite dimensions, and excessive bevels', () => {
        expect(() => patchStl(SPECTRE_PATCHES.S0)).toThrow(RangeError);
        for (const options of [
            { unitMm: 0 },
            { unitMm: Number.NaN },
            { thickness: -1 },
            { thickness: Number.POSITIVE_INFINITY },
            { bevel: -1 },
            { bevel: 4 },
            { bevel: Number.NaN },
            { unitMm: 0.1, bevel: 0.8 },
            { curveToleranceMm: 0 },
            { curveToleranceMm: Number.NaN },
        ]) {
            expect(() => patchStl(SPECTRE_PATCHES.Ma0, options)).toThrow(RangeError);
        }
    });

    it('welds shared edges despite floating-point drift in repeated placements', () => {
        const source = SPECTRE_PATCHES.Ma0;
        const patch = {
            ...source,
            tiles: source.tiles.map((tile, i) => ({
                ...tile,
                transform: { ...tile.transform, tx: tile.transform.tx + i * 1e-10 },
            })),
        };
        expectClosed(readStl(patchStl(patch)));
    });
});
