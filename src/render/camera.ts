/**
 * Camera — maps world coordinates to the on-screen drawing space.
 *
 * The frame is derived once from the Hat's extent and scaled only by the zoom
 * factor, so it is invariant to (a, b): the grid stays put and the tile deforms
 * in place. Whole-scene rotation is a *view* operation applied here (about the
 * frame center), so tile/grid geometry stays in its natural place and only the
 * camera turns. Backend-agnostic (no DOM); consumed by `buildScene`.
 */

import { createSmithTile, SQRT3 } from '../smithTile';
import { IDENTITY_TRANSFORM } from '../Transform';
import type { Vec2 } from '../Vec2';

/** Logical drawing surface (the SVG/Canvas viewBox). */
export const CANVAS_W = 940;
export const CANVAS_H = 640;
const PAD = 54;
/** Keep zoom=1 comfortably smaller than the original Hat-fitted view. */
const REFERENCE_SCALE_FACTOR = 0.7;

export type Camera = {
    /** world point → screen point (within CANVAS_W × CANVAS_H). */
    project(p: Vec2): Vec2;
    viewBox: readonly [number, number, number, number];
    /** World-space content center and the natural rotation pivot. */
    center: Vec2;
};

type Frame = { cx: number; cy: number; w: number; h: number };

/** Bounding frame of a point set, padded by 28% on each axis (the Hat margin). */
function frameOfPoints(points: readonly Vec2[]): Frame {
    if (points.length === 0) return { cx: 0, cy: 0, w: 4, h: 4 };
    let mnx = Infinity;
    let mny = Infinity;
    let mxx = -Infinity;
    let mxy = -Infinity;
    for (const p of points) {
        mnx = Math.min(mnx, p.x);
        mny = Math.min(mny, p.y);
        mxx = Math.max(mxx, p.x);
        mxy = Math.max(mxy, p.y);
    }
    const spanX = mxx - mnx;
    const spanY = mxy - mny;
    let w = spanX * 1.56; // span + 28% margin on each side
    let h = spanY * 1.56;
    // Guard degenerate extents (single point or an axis-aligned line) so the
    // scale stays finite.
    const MIN = 1;
    if (w < MIN) w = Math.max(h, MIN);
    if (h < MIN) h = Math.max(w, MIN);
    return { cx: (mnx + mxx) / 2, cy: (mny + mxy) / 2, w, h };
}

/** Hat-relative scale shared by every tile, patch, and worm camera. */
function referenceScale(): number {
    const frame = refFrame();
    return (
        Math.min((CANVAS_W - 2 * PAD) / frame.w, (CANVAS_H - 2 * PAD) / frame.h) *
        REFERENCE_SCALE_FACTOR
    );
}

/** A fixed-scale camera rotated about the supplied world-space center. */
function cameraFromCenter(center: Vec2, zoom: number, rotationDeg: number, pan: Vec2): Camera {
    const sc = referenceScale() * zoom;
    const rad = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
        // Rotate about the content center, then orthographic-project with the Y flip.
        project: (p) => {
            const dx = p.x - center.x;
            const dy = p.y - center.y;
            const rx = dx * cos - dy * sin;
            const ry = dx * sin + dy * cos;
            return {
                x: rx * sc + CANVAS_W / 2 + pan.x,
                y: -ry * sc + CANVAS_H / 2 + pan.y,
            };
        },
        viewBox: [0, 0, CANVAS_W, CANVAS_H],
        center,
    };
}

/** Fixed reference frame computed once from the Hat's extent. */
let refFrameCache: Frame | null = null;
function refFrame(): Frame {
    if (!refFrameCache) {
        const hat = createSmithTile(1, SQRT3, IDENTITY_TRANSFORM).shape.vertices.map(
            (v) => v.position,
        );
        refFrameCache = frameOfPoints(hat);
    }
    return refFrameCache;
}

/**
 * Build a camera for the given zoom (1 = fit the Hat frame) and whole-scene
 * rotation in degrees (counterclockwise, about the reference center). The frame is
 * invariant to (a, b), so a single tile deforms in place. For a tile reflected
 * across the world Y axis, the reference frame center is reflected as well.
 */
export function createCamera(
    zoom: number,
    rotationDeg = 0,
    mirrored = false,
    pan: Vec2 = { x: 0, y: 0 },
): Camera {
    const frame = refFrame();
    const center = { x: mirrored ? -frame.cx : frame.cx, y: frame.cy };
    return cameraFromCenter(center, zoom, rotationDeg, pan);
}

/**
 * Build a fixed-scale camera centered on the given world points. Point extent
 * affects only the initial center; it never changes the meaning of `zoom`.
 */
export function createCenteredCamera(
    points: readonly Vec2[],
    zoom = 1,
    rotationDeg = 0,
    pan: Vec2 = { x: 0, y: 0 },
): Camera {
    const frame = frameOfPoints(points);
    return cameraFromCenter({ x: frame.cx, y: frame.cy }, zoom, rotationDeg, pan);
}
