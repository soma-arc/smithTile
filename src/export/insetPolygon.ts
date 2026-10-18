import type { Vec2 } from '../geometry/Vec2';
import { cleanPolygon, isSimplePolygon } from './polygon2d';

const EPS = 1e-8;
const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;
const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });

/** Normalize a simple boundary to counterclockwise order. Units are millimetres. */
export function ccwPolygon(points: readonly Vec2[]): Vec2[] {
    if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
        throw new RangeError('Non-finite polygon coordinates');
    }
    const polygon = cleanPolygon(points);
    const area2 = polygon.reduce((sum, p, i) => {
        const q = polygon[(i + 1) % polygon.length];
        return sum + p.x * q.y - p.y * q.x;
    }, 0);
    if (Math.abs(area2) <= EPS || !isSimplePolygon(polygon)) {
        throw new RangeError('Expected a simple polygon with positive area');
    }
    return area2 < 0 ? polygon.reverse() : polygon;
}

/**
 * Mitered inward offset of a cleaned CCW polygon, retaining vertex correspondence.
 * Reject the first edge collapse or non-adjacent vertex/edge collision anywhere
 * during the offset sweep, rather than trying to repair a changed topology.
 */
export function insetPolygon(points: readonly Vec2[], distance: number): Vec2[] {
    if (!Number.isFinite(distance) || distance < 0) {
        throw new RangeError('Inset must be finite and nonnegative');
    }
    const normals = points.map((p, i) => {
        const edge = sub(points[(i + 1) % points.length], p);
        const length = Math.hypot(edge.x, edge.y);
        return { x: -edge.y / length, y: edge.x / length };
    });
    const velocities = normals.map((n, i) => {
        const prev = normals[(i + points.length - 1) % points.length];
        const denominator = 1 + dot(prev, n);
        if (denominator <= EPS) throw new RangeError('Cannot offset a folded corner');
        return { x: (prev.x + n.x) / denominator, y: (prev.y + n.y) / denominator };
    });
    const at = (i: number, d: number): Vec2 => ({
        x: points[i].x + velocities[i].x * d,
        y: points[i].y + velocities[i].y * d,
    });
    const inset = points.map((_, i) => at(i, distance));
    for (let j = 0; j < points.length; j++) {
        const next = (j + 1) % points.length;
        const edge = sub(points[next], points[j]);
        if (dot(sub(inset[next], inset[j]), edge) <= EPS) {
            throw new RangeError('Bevel collapses an edge');
        }
        for (let i = 0; i < points.length; i++) {
            if (i === j || i === next) continue;
            // Solve n·(vertex(d) - edgeStart(d)) = 0. All vertices
            // move linearly and the supporting edge moves at unit speed.
            const speed = dot(normals[j], velocities[i]) - 1;
            if (Math.abs(speed) <= EPS) continue;
            const contact = -dot(normals[j], sub(points[i], points[j])) / speed;
            if (contact <= EPS || contact > distance + EPS) continue;
            const start = at(j, contact);
            const end = at(next, contact);
            const vertex = at(i, contact);
            if (dot(sub(vertex, start), edge) >= -EPS && dot(sub(vertex, end), edge) <= EPS) {
                throw new RangeError('Bevel changes the polygon topology');
            }
        }
    }
    if (!isSimplePolygon(inset)) throw new RangeError('Bevel intersects itself');
    return inset;
}
