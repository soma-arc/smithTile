/**
 * Transform — a 2D affine transform represented by a 2×3 real matrix.
 *
 * Points are treated as column vectors with an implicit homogeneous
 * coordinate of 1:
 *
 *   [x']   [m00 m01 tx] [x]
 *   [y'] = [m10 m11 ty] [y]
 *                         [1]
 *
 * This is the upper two rows of the corresponding 3×3 homogeneous matrix.
 */

import type { Vec2 } from './Vec2';

export type Transform = {
    m00: number;
    m01: number;
    m10: number;
    m11: number;
    tx: number;
    ty: number;
};

/** The no-op transform. */
export const IDENTITY_TRANSFORM: Transform = {
    m00: 1,
    m01: 0,
    m10: 0,
    m11: 1,
    tx: 0,
    ty: 0,
};

/**
 * Build the scale → rotate → translate placement used by the tile and patch
 * constructors. More general affine transforms can be represented directly.
 */
export function createTransform(position: Vec2, rotation: number, scale = 1): Transform {
    const cos = Math.cos(rotation) * scale;
    const sin = Math.sin(rotation) * scale;
    return {
        m00: cos,
        m01: -sin,
        m10: sin,
        m11: cos,
        tx: position.x,
        ty: position.y,
    };
}

/** Reflect local geometry across the Y axis: `(x, y) ↦ (-x, y)`. */
export function createReflectionTransform(): Transform {
    return {
        m00: -1,
        m01: 0,
        m10: 0,
        m11: 1,
        tx: 0,
        ty: 0,
    };
}

/** Map a local point into world space, including translation. */
export function applyTransform(t: Transform, p: Vec2): Vec2 {
    return {
        x: t.m00 * p.x + t.m01 * p.y + t.tx,
        y: t.m10 * p.x + t.m11 * p.y + t.ty,
    };
}

/** Map a direction or displacement through only the linear part. */
export function applyTransformVector(t: Transform, v: Vec2): Vec2 {
    return {
        x: t.m00 * v.x + t.m01 * v.y,
        y: t.m10 * v.x + t.m11 * v.y,
    };
}

/** Map a direction angle through the linear part of the transform. */
export function applyTransformAngle(t: Transform, angleRad: number): number {
    const direction = applyTransformVector(t, {
        x: Math.cos(angleRad),
        y: Math.sin(angleRad),
    });
    return Math.atan2(direction.y, direction.x);
}

/** Map a whole polygon/point list into world space. */
export function transformPoints(t: Transform, points: readonly Vec2[]): Vec2[] {
    return points.map((p) => applyTransform(t, p));
}

/**
 * Compose two transforms as `f ∘ g`: `g` is applied first, followed by `f`.
 *
 * `applyTransform(composeTransforms(f, g), p)` is equivalent to
 * `applyTransform(f, applyTransform(g, p))`.
 */
export function composeTransforms(f: Transform, g: Transform): Transform {
    return {
        m00: f.m00 * g.m00 + f.m01 * g.m10,
        m01: f.m00 * g.m01 + f.m01 * g.m11,
        m10: f.m10 * g.m00 + f.m11 * g.m10,
        m11: f.m10 * g.m01 + f.m11 * g.m11,
        tx: f.m00 * g.tx + f.m01 * g.ty + f.tx,
        ty: f.m10 * g.tx + f.m11 * g.ty + f.ty,
    };
}
