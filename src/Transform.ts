/**
 * Transform — a 2D placement (uniform scale, rotation, translation) that maps
 * a piece of local geometry into world space.
 *
 * Applied in the order scale → rotate → translate. Rotation is in radians,
 * counterclockwise positive, in the coordinate system +x → right, +y → up
 * (the same convention as EDGE_TEMPLATE / the Hat orientation in smithTile.ts).
 */

import type { Vec2 } from './Vec2';

export type Transform = {
    position: Vec2;
    rotation: number;
    scale: number;
};

/** The no-op transform: origin, no rotation, unit scale. */
export const IDENTITY_TRANSFORM: Transform = {
    position: { x: 0, y: 0 },
    rotation: 0,
    scale: 1,
};

/** Map a local point into world space: scale, then rotate, then translate. */
export function applyTransform(t: Transform, p: Vec2): Vec2 {
    const cos = Math.cos(t.rotation);
    const sin = Math.sin(t.rotation);
    const x = p.x * t.scale;
    const y = p.y * t.scale;
    return {
        x: t.position.x + (x * cos - y * sin),
        y: t.position.y + (x * sin + y * cos),
    };
}

/** Map a whole polygon/point list into world space. */
export function transformPoints(t: Transform, points: readonly Vec2[]): Vec2[] {
    return points.map((p) => applyTransform(t, p));
}
