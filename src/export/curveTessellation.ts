import {
    type BoundarySegment,
    type CurveSpec,
    type PolylineCurve,
    type SmithTile,
    smithTileBoundary,
} from '../geometry/smithTile';
import { applyTransform } from '../geometry/Transform';
import type { Vec2 } from '../geometry/Vec2';

/** Maximum default deviation between a curved boundary and its STL chords. */
export const DEFAULT_CURVE_TOLERANCE_MM = 0.05;

function pointLineDistance(point: Vec2, start: Vec2, end: Vec2): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return Math.hypot(point.x - start.x, point.y - start.y);
    return Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) / length;
}

/** Adaptively replace a canonical cubic Bezier with straight chords. */
function sampleCubic(
    curve: Extract<CurveSpec, { kind: 'cubicBezier' }>,
    tolerance: number,
): Vec2[] {
    const points: Vec2[] = [{ x: 0, y: 0 }];
    const midpoint = (a: Vec2, b: Vec2): Vec2 => ({
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
    });
    const visit = (p0: Vec2, c1: Vec2, c2: Vec2, p1: Vec2, depth: number) => {
        const flatness = Math.max(pointLineDistance(c1, p0, p1), pointLineDistance(c2, p0, p1));
        if (flatness <= tolerance || depth >= 16) {
            points.push(p1);
            return;
        }
        const p01 = midpoint(p0, c1);
        const p12 = midpoint(c1, c2);
        const p23 = midpoint(c2, p1);
        const p012 = midpoint(p01, p12);
        const p123 = midpoint(p12, p23);
        const middle = midpoint(p012, p123);
        visit(p0, p01, p012, middle, depth + 1);
        visit(middle, p123, p23, p1, depth + 1);
    };
    visit({ x: 0, y: 0 }, curve.c1, curve.c2, { x: 1, y: 0 }, 0);
    return points;
}

/**
 * Tessellate once in canonical edge coordinates. Reusing this point sequence
 * on every tile edge guarantees that both sides of a shared edge have the
 * same number of chords.
 */
export function tessellateCurve(curve: CurveSpec, tolerance: number): PolylineCurve {
    if (!Number.isFinite(tolerance) || tolerance <= 0) {
        throw new RangeError(`curve tolerance must be positive (got ${tolerance})`);
    }
    switch (curve.kind) {
        case 'straight':
            return {
                kind: 'polyline',
                points: [
                    { x: 0, y: 0 },
                    { x: 1, y: 0 },
                ],
            };
        case 'polyline':
            if (curve.points.length < 2)
                throw new RangeError('Polyline requires at least two points');
            return curve;
        case 'cubicBezier':
            return { kind: 'polyline', points: sampleCubic(curve, tolerance) };
    }
}

function segmentPoints(segment: BoundarySegment): readonly Vec2[] {
    switch (segment.kind) {
        case 'line':
            return [segment.p0, segment.p1];
        case 'polyline':
            return segment.points;
        case 'cubicBezier':
            throw new Error('Expected a tessellated boundary');
    }
}

/** Build one tile's curved outline in world coordinates. */
export function tileCurveOutline(tile: SmithTile, curve: CurveSpec, tolerance: number): Vec2[] {
    const tessellated = tessellateCurve(curve, tolerance);
    const points: Vec2[] = [];
    for (const segment of smithTileBoundary(tile.shape, tessellated)) {
        points.push(
            ...segmentPoints(segment)
                .slice(0, -1)
                .map((p) => applyTransform(tile.transform, p)),
        );
    }
    return points;
}
