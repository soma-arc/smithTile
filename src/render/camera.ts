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

export type Camera = {
    /** world point → screen point (within CANVAS_W × CANVAS_H). */
    project(p: Vec2): Vec2;
    viewBox: readonly [number, number, number, number];
    /** World point shown at the canvas center (the natural rotation pivot). */
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

/** A camera that fits `frame` into the canvas at `zoom`, rotated about its center. */
function cameraFromFrame(rf: Frame, zoom: number, rotationDeg: number): Camera {
    const sc = Math.min((CANVAS_W - 2 * PAD) / rf.w, (CANVAS_H - 2 * PAD) / rf.h) * zoom;
    const rad = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
        // Rotate about the frame center, then orthographic-project with the Y flip.
        project: (p) => {
            const dx = p.x - rf.cx;
            const dy = p.y - rf.cy;
            const rx = dx * cos - dy * sin;
            const ry = dx * sin + dy * cos;
            return { x: rx * sc + CANVAS_W / 2, y: -ry * sc + CANVAS_H / 2 };
        },
        viewBox: [0, 0, CANVAS_W, CANVAS_H],
        center: { x: rf.cx, y: rf.cy },
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
 * rotation in degrees (counterclockwise, about the frame center). The frame is
 * invariant to (a, b), so a single tile deforms in place. For a tile reflected
 * across the world Y axis, the reference frame center is reflected as well.
 */
export function createCamera(zoom: number, rotationDeg = 0, mirrored = false): Camera {
    const frame = refFrame();
    return cameraFromFrame(mirrored ? { ...frame, cx: -frame.cx } : frame, zoom, rotationDeg);
}

/**
 * Build a camera that fits the given world points (e.g. a whole patch's
 * vertices), for scenes whose extent is not the fixed Hat frame.
 */
export function createFitCamera(points: readonly Vec2[], zoom = 1, rotationDeg = 0): Camera {
    return cameraFromFrame(frameOfPoints(points), zoom, rotationDeg);
}
