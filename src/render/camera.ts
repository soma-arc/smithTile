/**
 * Camera — maps world coordinates to the on-screen drawing space.
 *
 * The frame is derived once from the Hat's extent and scaled only by the zoom
 * factor, so it is invariant to (a, b): the grid stays put and the tile deforms
 * in place. Backend-agnostic (no DOM); consumed by `buildScene`.
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
};

/** Fixed reference frame computed once from the Hat's extent. */
let refFrameCache: { cx: number; cy: number; w: number; h: number } | null = null;
function refFrame() {
    if (refFrameCache) return refFrameCache;
    const hat = createSmithTile(1, SQRT3, IDENTITY_TRANSFORM).definition.shape.vertices;
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

/** Build a camera for the given zoom (1 = fit the Hat frame). */
export function createCamera(zoom: number): Camera {
    const rf = refFrame();
    const sc = Math.min((CANVAS_W - 2 * PAD) / rf.w, (CANVAS_H - 2 * PAD) / rf.h) * zoom;
    return {
        project: (p) => ({
            x: (p.x - rf.cx) * sc + CANVAS_W / 2,
            y: -(p.y - rf.cy) * sc + CANVAS_H / 2,
        }),
        viewBox: [0, 0, CANVAS_W, CANVAS_H],
    };
}
