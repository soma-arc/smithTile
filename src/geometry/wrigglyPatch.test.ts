import { booleans, geometries, measurements, primitives } from '@jscad/modeling';
import { describe, expect, it } from 'vitest';
import type { Patch } from './patchComposition';
import { getPortFromVertex } from './smithPatch';
import { polygonArea, SQRT3, smithTileWorldVertices } from './smithTile';
import {
    getSpectreWrigglyPatch,
    SPECTRE_WRIGGLY_KINDS,
    spectreWrigglyColorGroups,
} from './spectreWrigglyPatch';
import { getTileWrigglyPatch } from './tileWrigglyPatch';

function expectDisc(patch: Patch<string>) {
    const polygons = patch.tiles.map((tile) => {
        const points = smithTileWorldVertices(tile);
        return tile.mirrored ? [...points].reverse() : points;
    });
    if (!polygons.length) return;
    const expected = polygons.reduce((sum, p) => sum + polygonArea(p), 0);
    const merged = booleans.union(
        ...polygons.map((p) => primitives.polygon({ points: p.map((q) => [q.x, q.y]) })),
    );
    expect(Math.abs(measurements.measureArea(merged) - expected)).toBeLessThan(expected * 1e-5);
    expect(geometries.geom2.toOutlines(merged)).toHaveLength(1);
}

// Part II p.4: an independent oracle, not calculated from the generator.
const SPECTRE_COUNTS = [
    { Ma: 0, Mb: 0, I: 3, S: 2, N: 11, Aa: 5, Ab: 5 },
    { Ma: 27, Mb: 27, I: 100, S: 153, N: 712, Aa: 280, Ab: 280 },
    { Ma: 1704, Mb: 1704, I: 6107, S: 9514, N: 44163, Aa: 17325, Ab: 17325 },
];
describe('Spectre Wriggly (Part II)', () => {
    it('matches the published counts and arities through level 2 and stays homochiral', () => {
        for (const level of [0, 1, 2])
            for (const kind of SPECTRE_WRIGGLY_KINDS) {
                const p = getSpectreWrigglyPatch(kind, level);
                expect(p.tiles).toHaveLength(SPECTRE_COUNTS[level][kind]);
                expect(p.sockets).toHaveLength(
                    kind === 'I' ? 3 : kind === 'Aa' || kind === 'Ab' ? 2 : 1,
                );
                expect(p.tiles.every((t) => !t.mirrored)).toBe(true);
                expect([p.plug, ...p.sockets].every((s) => Number.isInteger(s.direction))).toBe(
                    true,
                );
                expect(getSpectreWrigglyPatch(kind, level)).toBe(p);
            }
    });
    for (const n of [0, 1])
        for (const kind of SPECTRE_WRIGGLY_KINDS) {
            it(`${kind}${n} has no overlapping interiors or holes`, () =>
                expectDisc(getSpectreWrigglyPatch(kind, n)));
        }
    it('uses the other reflex corner and the clockwise I0 inputs of the diagram', () => {
        const p = getSpectreWrigglyPatch('I', 0);
        expect(p.plug.position).toEqual(getPortFromVertex(p.tiles[0], 6).position);
        for (const [i, tile, vertex] of [
            [0, 1, 0],
            [1, 2, 2],
            [2, 1, 8],
        ]) {
            const source = getPortFromVertex(p.tiles[tile], vertex).position;
            expect(p.sockets[i].position.x).toBeCloseTo(source.x, 10);
            expect(p.sockets[i].position.y).toBeCloseTo(source.y, 10);
        }
    });
    it('reflects geometry, ports and colors together, including zero-tile identities', () => {
        const p = getSpectreWrigglyPatch('N', 1),
            m = getSpectreWrigglyPatch('N', 1, true);
        expect(m.tiles.every((t) => t.mirrored)).toBe(true);
        expect(m.plug.position.x).toBeCloseTo(-p.plug.position.x, 10);
        expect(m.plug.position.y).toBeCloseTo(p.plug.position.y, 10);
        const colored = spectreWrigglyColorGroups(m)
            .flatMap((g) => g.tiles)
            .map(smithTileWorldVertices);
        expect(colored).toHaveLength(m.tiles.length);
        expect(colored).toEqual(expect.arrayContaining(m.tiles.map(smithTileWorldVertices)));
        expect(spectreWrigglyColorGroups(getSpectreWrigglyPatch('Ma', 0))).toEqual([]);
    });
});

// Part IV p.2: b'=c+2s, c'=c+s+2b, s'=3b', starting with (1,2,3).
const TILE_COUNTS = [
    { B: 1, C: 2, S: 3 },
    { B: 8, C: 7, S: 24 },
    { B: 55, C: 47, S: 165 },
    { B: 377, C: 322, S: 1131 },
    { B: 2584, C: 2207, S: 7752 },
];
for (const [a, b] of [
    [1, SQRT3],
    [SQRT3, 1],
    [2, 3],
]) {
    describe(`Tile(${a},${b}) Wriggly (Part IV)`, () => {
        it('uses current-level B for S, retains two B/C inputs and caches parameters separately', () => {
            for (const level of [0, 1, 2, 3, 4])
                for (const kind of ['B', 'C', 'S'] as const) {
                    const p = getTileWrigglyPatch(a, b, kind, level);
                    expect(p.tiles).toHaveLength(TILE_COUNTS[level][kind]);
                    expect(p.sockets).toHaveLength(kind === 'S' ? 1 : 2);
                    expect(getTileWrigglyPatch(a, b, kind, level)).toBe(p);
                    expect(p.tiles.every((t) => t.shape.a === a && t.shape.b === b)).toBe(true);
                }
        });
        for (const level of [0, 1, 2, 3])
            for (const kind of ['B', 'C', 'S'] as const) {
                it(`${kind}${level} has no overlapping interiors or holes`, () =>
                    expectDisc(getTileWrigglyPatch(a, b, kind, level)));
            }
        it('matches the Part IV seed marks and reflects the complete construction', () => {
            const p = getTileWrigglyPatch(a, b, 'C', 0);
            expect(p.tiles.map((t) => t.mirrored)).toEqual([false, true]);
            expect(p.plug.position).toEqual(getPortFromVertex(p.tiles[0], 6).position);
            const source0 = getPortFromVertex(p.tiles[1], 12).position;
            expect(p.sockets[0].position.x).toBeCloseTo(source0.x, 10);
            expect(p.sockets[0].position.y).toBeCloseTo(source0.y, 10);
            const source1 = getPortFromVertex(p.tiles[1], 2).position;
            expect(p.sockets[1].position.x).toBeCloseTo(source1.x, 10);
            expect(p.sockets[1].position.y).toBeCloseTo(source1.y, 10);
            const mirror = getTileWrigglyPatch(a, b, 'C', 0, true);
            expect(mirror.tiles.map((t) => t.mirrored)).toEqual([true, false]);
            expect(mirror.sockets[0].position.x).toBeCloseTo(-p.sockets[0].position.x, 10);
        });
    });
}

it('rejects unsupported levels and invalid Tile(a,b) parameters before generation', () => {
    for (const n of [-1, 0.1, Number.NaN, Infinity]) {
        expect(() => getSpectreWrigglyPatch('I', n)).toThrow(RangeError);
        expect(() => getTileWrigglyPatch(1, 1, 'B', n)).toThrow(RangeError);
    }
    expect(() => getSpectreWrigglyPatch('I', 3)).toThrow(RangeError);
    expect(() => getTileWrigglyPatch(1, 1, 'B', 5)).toThrow(RangeError);
    for (const [a, b] of [
        [0, 0],
        [-1, 1],
        [Infinity, 1],
        [1, Number.NaN],
    ]) {
        expect(() => getTileWrigglyPatch(a, b, 'B', 0)).toThrow(RangeError);
    }
});

it('keeps zero-length A or B edges drawable during continuous parameter editing', () => {
    for (const [a, b] of [
        [0, 1],
        [1, 0],
    ]) {
        const patch = getTileWrigglyPatch(a, b, 'S', 2);
        expect(patch.tiles).toHaveLength(165);
        expect(
            patch.tiles
                .flatMap(smithTileWorldVertices)
                .every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
        ).toBe(true);
        expect(
            [patch.plug, ...patch.sockets].every(
                (p) => Number.isFinite(p.position.x) && Number.isFinite(p.position.y),
            ),
        ).toBe(true);
    }
});
