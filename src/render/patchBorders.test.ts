/**
 * Per-component boundary extraction — pure geometry (no DOM).
 */

import { describe, expect, it } from 'vitest';
import { colorMap, EDGE_COUNT, N0, PATCHES, smithTileWorldVertices } from '../smithTile';
import { componentBorders } from './patchBorders';

const EPS = 1e-6;
const ptKey = (p: { x: number; y: number }) =>
    `${Math.round(p.x / EPS)},${Math.round(p.y / EPS)}`;

describe('componentBorders', () => {
    it('a single-tile component outlines all 14 edges', () => {
        const borders = componentBorders(N0);
        expect(borders).toHaveLength(1); // one colored component
        expect(borders[0].color).toBe(colorMap.N);
        expect(borders[0].segments).toHaveLength(EDGE_COUNT); // no shared edges
    });

    it('drops interior edges of a patch with multi-tile components', () => {
        // N1 has 90 tiles grouped into several multi-tile components.
        const patch = PATCHES.N1;
        const borders = componentBorders(patch);
        expect(borders.length).toBeGreaterThan(1); // several colored components
        for (const b of borders) {
            expect(b.segments.length).toBeGreaterThan(0);
        }
        // total outline segments are fewer than every tile edge (interiors removed)
        const totalEdges = patch.tiles.reduce((n) => n + EDGE_COUNT, 0);
        const outlineEdges = borders.reduce((n, b) => n + b.segments.length, 0);
        expect(outlineEdges).toBeLessThan(totalEdges);
    });

    it('every component outline is a set of closed loops (even endpoint degree)', () => {
        for (const patch of Object.values(PATCHES)) {
            for (const b of componentBorders(patch)) {
                const degree = new Map<string, number>();
                for (const [p, q] of b.segments) {
                    degree.set(ptKey(p), (degree.get(ptKey(p)) ?? 0) + 1);
                    degree.set(ptKey(q), (degree.get(ptKey(q)) ?? 0) + 1);
                }
                for (const d of degree.values()) expect(d % 2).toBe(0);
            }
        }
    });

    it('outline segments reuse the tiles\' own world vertices', () => {
        // sanity: N0's outline endpoints all lie among its tile vertices
        const verts = new Set(N0.tiles.flatMap((t) => smithTileWorldVertices(t)).map(ptKey));
        for (const [p, q] of componentBorders(N0)[0].segments) {
            expect(verts.has(ptKey(p))).toBe(true);
            expect(verts.has(ptKey(q))).toBe(true);
        }
    });
});
