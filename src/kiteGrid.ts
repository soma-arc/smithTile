/**
 * Kite grid — the `[3.4.6.4]` Laves tiling that the Hat is carved from.
 *
 * The grid is shown only as a *reference*: it explains how the Hat relates to
 * its underlying kite lattice. It is never used to tile the plane.
 *
 * Two background modes exist (see the implementation notes):
 *   - Reference grid          — valid for every ratio (fixed Hat lattice)
 *   - Exact polykite decomp.  — only when the tile's vertices actually land on
 *                               the lattice and it decomposes into 8 kites
 */

import { createSmithTile, SQRT3 } from './smithTile';
import { applyTransform, IDENTITY_TRANSFORM, type Transform } from './Transform';
import type { Vec2 } from './Vec2';

/** A kite is a 4-point polygon: [center, mid, vertex, mid]. */
export type Kite = [Vec2, Vec2, Vec2, Vec2];

// Module-level memoization — the grid is invariant, computed once.
let gridCache: Kite[] | null = null;
let gridVertsCache: Set<string> | null = null;
let hatKitesCache: Kite[] | null = null;

/** Centroid of a point set. */
export function centroid(points: readonly Vec2[]): Vec2 {
    let x = 0;
    let y = 0;
    for (const p of points) {
        x += p.x;
        y += p.y;
    }
    return { x: x / points.length, y: y / points.length };
}

/** Point-in-polygon test (ray casting). */
export function pointInPolygon(pt: Vec2, poly: readonly Vec2[]): boolean {
    let inside = false;
    const n = poly.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = poly[i].x;
        const yi = poly[i].y;
        const xj = poly[j].x;
        const yj = poly[j].y;
        const intersects =
            yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
        if (intersects) inside = !inside;
    }
    return inside;
}

/** All kites of the reference lattice covering the working area. */
export function gridKites(): Kite[] {
    if (gridCache) return gridCache;
    const kites: Kite[] = [];
    for (let m = -3; m <= 4; m++) {
        for (let n = -3; n <= 3; n++) {
            const cx = 1 + 3 * m;
            const cy = SQRT3 + SQRT3 * m + 2 * SQRT3 * n;
            const center: Vec2 = { x: cx, y: cy };
            const outer: Vec2[] = []; // hexagon vertices (radius 2)
            const mid: Vec2[] = []; // edge midpoints (radius √3)
            for (let k = 0; k < 6; k++) {
                outer.push({
                    x: cx + 2 * Math.cos((k * Math.PI) / 3),
                    y: cy + 2 * Math.sin((k * Math.PI) / 3),
                });
                mid.push({
                    x: cx + SQRT3 * Math.cos((k * Math.PI) / 3 + Math.PI / 6),
                    y: cy + SQRT3 * Math.sin((k * Math.PI) / 3 + Math.PI / 6),
                });
            }
            for (let k = 0; k < 6; k++) {
                kites.push([center, mid[(k + 5) % 6], outer[k], mid[k]]);
            }
        }
    }
    // The tile template is oriented with a 180° turn (see EDGE_TEMPLATE); rotate
    // the lattice to match so the Hat still lands on its kites. A 180° rotation
    // about the origin is simply negating both coordinates.
    gridCache = kites.map((kite) => kite.map((p) => ({ x: -p.x, y: -p.y })) as Kite);
    return gridCache;
}

/** One kite mapped into world space by a transform. */
export function transformKite(kite: Kite, t: Transform): Kite {
    return kite.map((p) => applyTransform(t, p)) as Kite;
}

/** All reference-lattice kites mapped into world space by a transform. */
export function transformedGridKites(t: Transform): Kite[] {
    return gridKites().map((kite) => transformKite(kite, t));
}

/** The tile's boundary vertices in local (untransformed) space. */
function localTileVertices(a: number, b: number): readonly Vec2[] {
    return createSmithTile(a, b, IDENTITY_TRANSFORM).shape.vertices.map((v) => v.position);
}

/** Rounded coordinate key, used to test lattice membership. */
function pointKey(x: number, y: number): string {
    const round = (v: number) => {
        const n = Math.round(v * 1000) / 1000;
        return Object.is(n, -0) ? 0 : n;
    };
    return `${round(x)},${round(y)}`;
}

/** Set of all lattice vertex keys. */
export function gridVertices(): Set<string> {
    if (gridVertsCache) return gridVertsCache;
    const set = new Set<string>();
    for (const kite of gridKites()) {
        for (const p of kite) set.add(pointKey(p.x, p.y));
    }
    gridVertsCache = set;
    return set;
}

/** The 8 kites that make up the Hat, `Tile(1, √3)`. */
export function hatKites(): Kite[] {
    if (hatKitesCache) return hatKitesCache;
    const hat = localTileVertices(1, SQRT3);
    hatKitesCache = gridKites().filter((kite) => pointInPolygon(centroid(kite), hat));
    return hatKitesCache;
}

/** The kites whose centroid lies inside the given tile polygon. */
export function kitesInside(vertices: readonly Vec2[]): Kite[] {
    return gridKites().filter((kite) => pointInPolygon(centroid(kite), vertices));
}

/**
 * True when `Tile(a, b)` is an exact polykite on the reference lattice: every
 * vertex lands on a lattice point and the tile decomposes into exactly 8 kites.
 * Holds for Hat and Turtle; not for general ratios like `Tile(1, 4)`.
 */
export function polykiteValid(a: number, b: number): boolean {
    const vertices = localTileVertices(a, b);
    const verts = gridVertices();
    if (!vertices.every((p) => verts.has(pointKey(p.x, p.y)))) return false;
    return kitesInside(vertices).length === 8;
}
