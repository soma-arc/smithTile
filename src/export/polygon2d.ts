/**
 * Polygon cleanup for solid export.
 *
 * `EDGE_TEMPLATE` always yields 14 vertices, but some of them are never real
 * corners: edges 8 and 9 both point along +x, so vertex 9 is collinear at every
 * (a, b). At the degenerate presets one edge length is zero, so whole vertices
 * coincide — Comet (1, 0) and Chevron (0, 1) each have 6 of their 14 points
 * duplicated. Extruding such a polygon produces zero-area triangles and an
 * invalid mesh, so this cleanup runs before any solid is built.
 *
 * Pure and DOM-free.
 */

import type { Vec2 } from '../geometry/Vec2';

/** Default tolerance, in tile units (the polygon is cleaned before scaling). */
const DEFAULT_EPS = 1e-9;

/** Cross product of p→q and q→r; zero when the three points are collinear. */
function cross(p: Vec2, q: Vec2, r: Vec2): number {
    return (q.x - p.x) * (r.y - q.y) - (q.y - p.y) * (r.x - q.x);
}

/**
 * Drop coincident points and merge runs of collinear ones, so every remaining
 * vertex is a real corner. Winding is preserved (the tile's own vertex order is
 * counterclockwise, which is what JSCAD's `polygon` expects).
 *
 * Removing one point can make its neighbours collinear, so the sweep repeats
 * until it reaches a fixed point.
 *
 * @throws RangeError if fewer than 3 distinct corners remain.
 */
export function cleanPolygon(points: readonly Vec2[], eps: number = DEFAULT_EPS): Vec2[] {
    // Coincident points first: collinearity is meaningless across a zero-length
    // edge (the cross product of a zero vector vanishes for any neighbour).
    let out: Vec2[] = [];
    for (const p of points) {
        const last = out[out.length - 1];
        if (last && Math.hypot(p.x - last.x, p.y - last.y) <= eps) continue;
        out.push(p);
    }
    // The list is cyclic, so the last point may also coincide with the first.
    while (out.length > 1) {
        const first = out[0];
        const last = out[out.length - 1];
        if (Math.hypot(first.x - last.x, first.y - last.y) > eps) break;
        out.pop();
    }

    // Then collinear runs, repeatedly until nothing more can be removed. The
    // sweep must still run at exactly 3 points, so a fully collinear sliver
    // collapses to nothing and is rejected below rather than passing as a
    // "triangle" of zero area.
    let removed = true;
    while (removed && out.length >= 3) {
        removed = false;
        const kept: Vec2[] = [];
        for (let i = 0; i < out.length; i++) {
            const prev = kept[kept.length - 1] ?? out[(i + out.length - 1) % out.length];
            const next = out[(i + 1) % out.length];
            if (Math.abs(cross(prev, out[i], next)) <= eps) {
                removed = true;
                continue;
            }
            kept.push(out[i]);
        }
        out = kept;
    }

    if (out.length < 3) {
        throw new RangeError(
            `cleanPolygon: need at least 3 distinct corners, got ${out.length} from ${points.length} points`,
        );
    }
    return out;
}

function orientation(a: Vec2, b: Vec2, c: Vec2, eps: number): number {
    const value = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    return Math.abs(value) <= eps ? 0 : Math.sign(value);
}

function onSegment(a: Vec2, p: Vec2, b: Vec2, eps: number): boolean {
    return (
        p.x >= Math.min(a.x, b.x) - eps &&
        p.x <= Math.max(a.x, b.x) + eps &&
        p.y >= Math.min(a.y, b.y) - eps &&
        p.y <= Math.max(a.y, b.y) + eps
    );
}

function segmentsIntersect(a: Vec2, b: Vec2, c: Vec2, d: Vec2, eps: number): boolean {
    const abc = orientation(a, b, c, eps);
    const abd = orientation(a, b, d, eps);
    const cda = orientation(c, d, a, eps);
    const cdb = orientation(c, d, b, eps);

    if (abc !== abd && cda !== cdb) return true;
    return (
        (abc === 0 && onSegment(a, c, b, eps)) ||
        (abd === 0 && onSegment(a, d, b, eps)) ||
        (cda === 0 && onSegment(c, a, d, eps)) ||
        (cdb === 0 && onSegment(c, b, d, eps))
    );
}

/** Whether a cyclic polygon has no intersections between non-adjacent edges. */
export function isSimplePolygon(points: readonly Vec2[], eps: number = DEFAULT_EPS): boolean {
    for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        for (let j = i + 1; j < points.length; j++) {
            // Consecutive edges intentionally meet at their shared endpoint.
            if (j === i + 1 || (i === 0 && j === points.length - 1)) continue;
            const c = points[j];
            const d = points[(j + 1) % points.length];
            if (segmentsIntersect(a, b, c, d, eps)) return false;
        }
    }
    return true;
}
