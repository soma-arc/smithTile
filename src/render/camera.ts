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

/** Fixed reference frame computed once from the Hat's extent. */
let refFrameCache: { cx: number; cy: number; w: number; h: number } | null = null;
function refFrame() {
    if (refFrameCache) return refFrameCache;
    const hat = createSmithTile(1, SQRT3, IDENTITY_TRANSFORM).shape.vertices;
    let mnx = Infinity;
    let mny = Infinity;
    let mxx = -Infinity;
    let mxy = -Infinity;
    for (const p of hat) {
        mnx = Math.min(mnx, p.x);
        mny = Math.min(mny, p.y);
        mxx = Math.max(mxx, p.x);
        mxy = Math.max(mxy, p.y);
    }
    const mx = (mxx - mnx) * 0.28;
    const my = (mxy - mny) * 0.28;
    refFrameCache = {
        cx: (mnx + mxx) / 2,
        cy: (mny + mxy) / 2,
        w: mxx - mnx + 2 * mx,
        h: mxy - mny + 2 * my,
    };
    return refFrameCache;
}

/**
 * Build a camera for the given zoom (1 = fit the Hat frame) and whole-scene
 * rotation in degrees (counterclockwise, about the frame center).
 */
export function createCamera(zoom: number, rotationDeg = 0): Camera {
    const rf = refFrame();
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
