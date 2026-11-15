import { extrusions, geometries } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import type { SmithPatch } from '../geometry/smithPatch';
import { smithTileWorldVertices } from '../geometry/smithTile';
import type { Vec2 } from '../geometry/Vec2';
import { ccwPolygon, insetPolygon } from './insetPolygon';
import { solidToStl } from './stl';

export type PatchStlOptions = {
    unitMm: number;
    thickness: number;
    /** Horizontal width and height of the 45-degree top bevel, in mm. */
    bevel: number;
};

export const DEFAULT_PATCH_STL_OPTIONS: PatchStlOptions = {
    unitMm: 10,
    thickness: 4,
    bevel: 0.8,
};

/** Ear clipping with inclusive point tests avoids zero-area ears along diagonals. */
function cap(points: readonly Vec2[], z: number, reverse: boolean) {
    // World-space edge welding can move a collinear point by a few nanometres.
    // Do not clip those numerical slivers as ears, even on distant tiles.
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const epsilon =
        Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 1e-7;
    const cross = (a: Vec2, b: Vec2, c: Vec2) =>
        (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const remaining = points.map((_, i) => i);
    const triangles: number[][] = [];
    while (remaining.length > 3) {
        let clipped = false;
        for (let i = 0; i < remaining.length; i++) {
            const a = remaining[(i + remaining.length - 1) % remaining.length];
            const b = remaining[i];
            const c = remaining[(i + 1) % remaining.length];
            if (cross(points[a], points[b], points[c]) <= epsilon) continue;
            const occupied = remaining.some(
                (j) =>
                    j !== a &&
                    j !== b &&
                    j !== c &&
                    cross(points[a], points[b], points[j]) >= -epsilon &&
                    cross(points[b], points[c], points[j]) >= -epsilon &&
                    cross(points[c], points[a], points[j]) >= -epsilon,
            );
            if (occupied) continue;
            triangles.push([a, b, c]);
            remaining.splice(i, 1);
            clipped = true;
            break;
        }
        if (!clipped) throw new RangeError('Cannot triangulate the patch boundary');
    }
    if (cross(points[remaining[0]], points[remaining[1]], points[remaining[2]]) <= epsilon) {
        throw new RangeError('Degenerate cap triangle');
    }
    triangles.push(remaining);
    return triangles.map((triangle) =>
        geometries.poly3.fromPoints(
            (reverse ? triangle.slice().reverse() : triangle).map((i) => [
                points[i].x,
                points[i].y,
                z,
            ]),
        ),
    );
}

/** Flat bottom, unchanged footprint, and a constant-width bevel on the top only. */
export function beveledSolid(pointsMm: readonly Vec2[], thickness: number, bevel: number): Geom3 {
    if (
        !Number.isFinite(thickness) ||
        thickness <= 0 ||
        !Number.isFinite(bevel) ||
        bevel < 0 ||
        bevel >= thickness
    ) {
        throw new RangeError('Expected thickness > 0 and 0 <= bevel < thickness');
    }
    const bottom = ccwPolygon(pointsMm);
    const top = bevel === 0 ? bottom : insetPolygon(bottom, bevel);
    const base = extrusions.slice.fromPoints(bottom.map((p) => [p.x, p.y, 0]));
    const solid = extrusions.extrudeFromSlices(
        {
            numberOfSlices: bevel === 0 ? 2 : 3,
            capStart: false,
            capEnd: false,
            callback: (_progress, index) => {
                const ring = index === 2 ? top : bottom;
                const z = index === 0 ? 0 : index === 1 ? thickness - bevel : thickness;
                return extrusions.slice.fromPoints(ring.map((p) => [p.x, p.y, z]));
            },
        },
        base,
    );
    // Build caps explicitly: near-collinear diagonal vertices in Smith tiles
    // can yield degenerate triangles in the default slice triangulator.
    return geometries.geom3.create([
        ...geometries.geom3.toPolygons(solid),
        ...cap(bottom, 0, true),
        ...cap(top, thickness, false),
    ]);
}

/** Straight-edged tiles at the patch's model coordinates, with no gap or camera transform. */
export function patchSolids(
    patch: Pick<SmithPatch, 'tiles'>,
    options: Partial<PatchStlOptions> = {},
): Geom3[] {
    const opts = { ...DEFAULT_PATCH_STL_OPTIONS, ...options };
    if (!Number.isFinite(opts.unitMm) || opts.unitMm <= 0 || patch.tiles.length === 0) {
        throw new RangeError('Expected a positive scale and a nonempty patch');
    }
    return patch.tiles.map((tile) =>
        beveledSolid(
            smithTileWorldVertices(tile).map((p) => ({
                x: p.x * opts.unitMm,
                y: p.y * opts.unitMm,
            })),
            opts.thickness,
            opts.bevel,
        ),
    );
}

/**
 * Assemble an edge-matched Smith patch as one surface. Shared vertical walls
 * cancel; bottom caps and top bevels meet along the original tile edges.
 * Keeping the collinear boundary vertices is essential at tile junctions.
 * This avoids a global BSP union, which is prohibitively large for level 2.
 */
export function patchSolid(
    patch: Pick<SmithPatch, 'tiles'>,
    options: Partial<PatchStlOptions> = {},
): Geom3 {
    const { unitMm, thickness, bevel } = { ...DEFAULT_PATCH_STL_OPTIONS, ...options };
    if (
        !Number.isFinite(unitMm) ||
        unitMm <= 0 ||
        patch.tiles.length === 0 ||
        !Number.isFinite(thickness) ||
        thickness <= 0 ||
        !Number.isFinite(bevel) ||
        bevel < 0 ||
        bevel >= thickness
    ) {
        throw new RangeError('Invalid patch dimensions or empty patch');
    }
    const polygons: ReturnType<typeof cap> = [];
    const walls = new Map<string, { a: Vec2; b: Vec2 }>();
    const paired = new Set<string>();
    const weldTolerance = unitMm * 1e-8;
    const vertices = new Map<string, Vec2[]>();
    const weld = (p: Vec2): Vec2 => {
        const x = Math.floor(p.x / weldTolerance);
        const y = Math.floor(p.y / weldTolerance);
        // Search neighboring buckets: rounding alone misses shared vertices
        // on opposite sides of a grid boundary after repeated patch transforms.
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (const q of vertices.get(`${x + dx},${y + dy}`) ?? []) {
                    if (Math.hypot(p.x - q.x, p.y - q.y) <= weldTolerance) return q;
                }
            }
        }
        const key = `${x},${y}`;
        const bucket = vertices.get(key) ?? [];
        bucket.push(p);
        vertices.set(key, bucket);
        return p;
    };
    const pointKey = (p: Vec2) => `${p.x},${p.y}`;
    const at = (p: Vec2, z: number): [number, number, number] => [p.x, p.y, z];
    const quad = (
        a: [number, number, number],
        b: [number, number, number],
        c: [number, number, number],
        d: [number, number, number],
    ) => {
        polygons.push(
            geometries.poly3.fromPoints([a, b, c]),
            geometries.poly3.fromPoints([a, c, d]),
        );
    };
    for (const tile of patch.tiles) {
        const bottom = smithTileWorldVertices(tile).map((p) =>
            weld({ x: p.x * unitMm, y: p.y * unitMm }),
        );
        ccwPolygon(bottom); // validate without removing the shared collinear vertices
        const area2 = bottom.reduce((sum, p, i) => {
            const q = bottom[(i + 1) % bottom.length];
            return sum + p.x * q.y - p.y * q.x;
        }, 0);
        if (area2 < 0) bottom.reverse();
        const top = bevel === 0 ? bottom : insetPolygon(bottom, bevel);
        polygons.push(...cap(bottom, 0, true), ...cap(top, thickness, false));
        for (let i = 0; i < bottom.length; i++) {
            const j = (i + 1) % bottom.length;
            const a = bottom[i];
            const b = bottom[j];
            const key = `${pointKey(a)}|${pointKey(b)}`;
            const opposite = `${pointKey(b)}|${pointKey(a)}`;
            if (walls.has(key) || paired.has(key) || paired.has(opposite)) {
                throw new RangeError('Patch contains duplicate or overlapping tile edges');
            }
            if (walls.has(opposite)) {
                walls.delete(opposite);
                paired.add(key);
            } else walls.set(key, { a, b });
            if (bevel > 0)
                quad(
                    at(a, thickness - bevel),
                    at(b, thickness - bevel),
                    at(top[j], thickness),
                    at(top[i], thickness),
                );
        }
    }
    for (const { a, b } of walls.values()) {
        quad(at(a, 0), at(b, 0), at(b, thickness - bevel), at(a, thickness - bevel));
    }
    return geometries.geom3.create(polygons);
}

export function patchStl(
    patch: Pick<SmithPatch, 'tiles'>,
    options: Partial<PatchStlOptions> = {},
): Uint8Array<ArrayBuffer> {
    return solidToStl(patchSolid(patch, options));
}
