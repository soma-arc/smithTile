import { booleans, geometries, measurements, primitives } from '@jscad/modeling';
import { describe, expect, it } from 'vitest';
import { getPortFromVertex } from './smithPatch';
import { polygonArea, smithTileWorldVertices } from './smithTile';
import { applyTransform, createReflectionTransform } from './Transform';
import {
    applyTilePatch,
    attachTilePatch,
    getTileArticulatedPatch,
    MAX_TILE_PATCH_LEVEL,
    TILE_PATCH_KINDS,
    tilePatchColorGroups,
    tilePatchPort,
} from './tileArticulatedPatch';

// Counts independently expanded from Künzel III p.2:
// b'=6b+c, s'=b, c'=2c+4b+s, starting at (1,0,3).
const COUNTS = [
    { B: 1, S: 0, C: 3 },
    { B: 9, S: 1, C: 10 },
    { B: 64, S: 9, C: 57 },
    { B: 441, S: 64, C: 379 },
    { B: 3025, S: 441, C: 2586 },
];

for (const tile of ['hat', 'turtle'] as const) {
    describe(`${tile} articulated patches`, () => {
        it('keeps S0 as the identity and counts every level using previous-level S', () => {
            for (let level = 0; level <= MAX_TILE_PATCH_LEVEL; level++) {
                for (const kind of TILE_PATCH_KINDS) {
                    const patch = getTileArticulatedPatch(tile, kind, level);
                    expect(patch.tiles).toHaveLength(COUNTS[level][kind]);
                    expect(patch.sockets).toHaveLength(kind === 'C' ? 5 : 1);
                    expect(patch.kind).toBe(kind);
                    expect(patch.level).toBe(level);
                    expect(getTileArticulatedPatch(tile, kind, level)).toBe(patch);
                }
            }
        });

        it('matches the initial plug and the five x,y,z,u,v marks in PDF p.2', () => {
            const b = getTileArticulatedPatch(tile, 'B', 0);
            const c = getTileArticulatedPatch(tile, 'C', 0);
            expect(c.tiles.map((part) => part.mirrored)).toEqual([false, true, false]);
            for (const [actual, source] of [
                [b.plug, getPortFromVertex(b.tiles[0], 4)],
                [b.sockets[0], getPortFromVertex(b.tiles[0], 10)],
                [c.plug, getPortFromVertex(c.tiles[0], 4)],
                ...[
                    [0, 0],
                    [1, 8],
                    [2, 10],
                    [2, 8],
                    [1, 0],
                ].map(
                    ([part, vertex], i) =>
                        [c.sockets[i], getPortFromVertex(c.tiles[part], vertex)] as const,
                ),
            ] as const) {
                expect(actual.position.x).toBeCloseTo(source.position.x, 10);
                expect(actual.position.y).toBeCloseTo(source.position.y, 10);
                expect(Number.isInteger(actual.direction)).toBe(true);
                expect(Math.cos(tilePatchPort(actual).inwardAngleRad)).toBeCloseTo(
                    Math.cos(source.inwardAngleRad),
                    10,
                );
                expect(Math.sin(tilePatchPort(actual).inwardAngleRad)).toBeCloseTo(
                    Math.sin(source.inwardAngleRad),
                    10,
                );
            }
        });

        for (const level of [0, 1, 2, 3, 4]) {
            for (const kind of TILE_PATCH_KINDS) {
                if (kind === 'S' && level === 0) continue;
                it(`${kind}${level} has no overlapping interiors, disconnected pieces, or holes`, () => {
                    const patch = getTileArticulatedPatch(tile, kind, level);
                    const polygons = patch.tiles.map((part) => {
                        const points = smithTileWorldVertices(part);
                        return part.mirrored ? [...points].reverse() : points;
                    });
                    const expected = polygons.reduce((area, p) => area + polygonArea(p), 0);
                    const merged = booleans.union(
                        ...polygons.map((p) =>
                            primitives.polygon({ points: p.map(({ x, y }) => [x, y]) }),
                        ),
                    );
                    // JSCAD snaps Boolean coordinates to its own ~1e-5 grid.
                    expect(Math.abs(measurements.measureArea(merged) - expected)).toBeLessThan(
                        expected * 1e-5,
                    );
                    expect(geometries.geom2.toOutlines(merged)).toHaveLength(1);
                });
            }
        }

        it('propagates all argument sockets in order and preserves the parent plug', () => {
            const b = getTileArticulatedPatch(tile, 'B', 0);
            const c = getTileArticulatedPatch(tile, 'C', 0);
            const attached = attachTilePatch(b, 0, c);
            expect(attached.plug).toBe(b.plug);
            expect(attached.sockets).toHaveLength(5);
            for (let i = 0; i < 5; i++) {
                const parent = attached.sockets[i];
                const source = c.sockets[i];
                expect(Number.isInteger(parent.direction)).toBe(true);
                // A rigid placement preserves each socket's distance to the plug.
                expect(
                    Math.hypot(
                        parent.position.x - b.sockets[0].position.x,
                        parent.position.y - b.sockets[0].position.y,
                    ),
                ).toBeCloseTo(
                    Math.hypot(
                        source.position.x - c.plug.position.x,
                        source.position.y - c.plug.position.y,
                    ),
                    10,
                );
            }
            const id = getTileArticulatedPatch(tile, 'S', 0);
            const throughId = applyTilePatch(id, [b]);
            const closed = applyTilePatch(b, [{ ...id, sockets: [] }]);
            expect(throughId.tiles).toHaveLength(1);
            expect(throughId.sockets).toHaveLength(1);
            expect(closed.sockets).toHaveLength(0);
            expect(closed.tiles).toHaveLength(1);
        });

        it('reflects the whole construction, including ports and component fills', () => {
            const patch = getTileArticulatedPatch(tile, 'C', 2);
            const mirror = getTileArticulatedPatch(tile, 'C', 2, true);
            const reflect = createReflectionTransform();
            patch.tiles.forEach((part, index) => {
                const original = smithTileWorldVertices(part).map((p) =>
                    applyTransform(reflect, p),
                );
                smithTileWorldVertices(mirror.tiles[index]).forEach((p, vertex) => {
                    expect(p.x).toBeCloseTo(original[vertex].x, 9);
                    expect(p.y).toBeCloseTo(original[vertex].y, 9);
                });
            });
            [patch.plug, ...patch.sockets].forEach((port, i) => {
                const mirrored = [mirror.plug, ...mirror.sockets][i];
                expect(mirrored.position.x).toBeCloseTo(-port.position.x, 9);
                expect(mirrored.position.y).toBeCloseTo(port.position.y, 9);
                expect(mirrored.direction).toBe((((6 - port.direction) % 12) + 12) % 12);
            });
            const colored = tilePatchColorGroups(mirror).flatMap((group) => group.tiles);
            expect(colored).toHaveLength(mirror.tiles.length);
            expect(colored.map(smithTileWorldVertices)).toEqual(
                expect.arrayContaining(mirror.tiles.map(smithTileWorldVertices)),
            );
        });
    });
}

it('rejects invalid levels, socket indices, and function arities', () => {
    for (const level of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, MAX_TILE_PATCH_LEVEL + 1]) {
        expect(() => getTileArticulatedPatch('hat', 'B', level)).toThrow(RangeError);
    }
    const b = getTileArticulatedPatch('hat', 'B', 0);
    for (const index of [-1, 1, 0.5, Number.NaN]) {
        expect(() => attachTilePatch(b, index, b)).toThrow(RangeError);
    }
    expect(() => applyTilePatch(b, [])).toThrow(RangeError);
    expect(() => applyTilePatch(b, [b, b])).toThrow(RangeError);
});
