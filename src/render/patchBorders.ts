/**
 * Per-component boundary extraction for a patch — a render-layer utility.
 *
 * For a selected patch, each named component (see `patchColorGroups`) is a set
 * of unit spectre tiles. The outline of a component's tile-union is exactly the
 * set of boundary edges that are NOT shared by two of its own tiles: an edge
 * seen once is on the perimeter, an edge seen twice is interior. Because every
 * tile edge is unit length (`Tile(1, 1)`), neighbors always meet edge-to-edge,
 * so this whole-edge tally is exact — no reliance on the Hat/Turtle kite grid.
 */

import { patchColorGroups, type SmithPatch } from '../geometry/smithPatch';
import { type SmithTile, smithTileWorldVertices } from '../geometry/smithTile';
import type { Vec2 } from '../geometry/Vec2';

export type ComponentBoundaryEdge = { tile: SmithTile; edgeIndex: number };
export type ComponentBorder = { color: string; edges: ComponentBoundaryEdge[] };
export type ComponentColorGroup = { fill: string; tiles: readonly SmithTile[] };

/** Quantize a coordinate so endpoints computed via different transform paths
 *  (accumulated float error under 30°-multiple rotations) still match. */
const EPS = 1e-6;
function round(v: number): number {
    const n = Math.round(v / EPS) * EPS;
    return Object.is(n, -0) ? 0 : n;
}
function ptKey(p: Vec2): string {
    return `${round(p.x)},${round(p.y)}`;
}
/** Orientation-independent key for the edge {p, q}. */
function edgeKey(p: Vec2, q: Vec2): string {
    const a = ptKey(p);
    const b = ptKey(q);
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * References to the outline edges of each colored component. Adjacency is
 * resolved from the straight skeleton, while the eventual boundary appearance
 * remains a rendering concern.
 */
export function colorGroupBorders(groups: readonly ComponentColorGroup[]): ComponentBorder[] {
    return groups.map(({ fill, tiles }) => {
        // Tally each undirected skeleton edge; remember its tile/edge reference
        // so rendering can apply any compatible canonical edge curve later.
        const count = new Map<string, number>();
        const refs = new Map<string, ComponentBoundaryEdge>();
        for (const tile of tiles) {
            const v = smithTileWorldVertices(tile);
            for (let i = 0; i < v.length; i++) {
                const a = v[i];
                const b = v[(i + 1) % v.length];
                const k = edgeKey(a, b);
                count.set(k, (count.get(k) ?? 0) + 1);
                if (!refs.has(k)) refs.set(k, { tile, edgeIndex: i });
            }
        }
        const edges: ComponentBoundaryEdge[] = [];
        for (const [k, n] of count) {
            if (n === 1) edges.push(refs.get(k) as ComponentBoundaryEdge);
        }
        return { color: fill, edges };
    });
}

export function componentBorders(patch: SmithPatch): ComponentBorder[] {
    return colorGroupBorders(patchColorGroups(patch));
}
