/**
 * STL export for a single Tile(a, b).
 *
 * The tile's 2D boundary is cleaned (see `polygon2d.ts`), scaled to millimetres
 * and extruded into a flat slab, then serialized as a binary STL.
 *
 * Pure and DOM-free — saving the bytes to a file is `download.ts`.
 */

import { extrusions, primitives } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { serialize } from '@jscad/stl-serializer';
import { fmtNum } from '../format';
import { createSmithTile, smithTileWorldVertices } from '../smithTile';
import { createReflectionTransform, IDENTITY_TRANSFORM } from '../Transform';
import { cleanPolygon } from './polygon2d';

export type StlOptions = {
    /** Slab thickness, in millimetres. */
    thickness: number;
    /** Millimetres per unit edge length, i.e. the printed length of `a = 1`. */
    unitMm: number;
    /** Reflect the tile across its local Y axis before extrusion. */
    mirrored?: boolean;
};

/** Prints the Hat at 60 × 43 × 4 mm — a comfortable size to hold and to print. */
export const DEFAULT_STL_OPTIONS: StlOptions = {
    thickness: 4,
    unitMm: 10,
    mirrored: false,
};

/** The tile as a flat slab, in millimetres, sitting on the z = 0 plane. */
export function tileSolid(a: number, b: number, opts: StlOptions): Geom3 {
    // Clean before scaling: the tolerance in `cleanPolygon` is in tile units.
    const transform = opts.mirrored ? createReflectionTransform() : IDENTITY_TRANSFORM;
    const outline = cleanPolygon(smithTileWorldVertices(createSmithTile(a, b, transform)));
    // Reflection reverses the polygon winding; JSCAD expects a counterclockwise outline.
    if (opts.mirrored) outline.reverse();
    const points = outline.map((p): [number, number] => [p.x * opts.unitMm, p.y * opts.unitMm]);
    return extrusions.extrudeLinear({ height: opts.thickness }, primitives.polygon({ points }));
}

/** Join the serializer's "blobable array" of buffers into one byte array. */
function concatBuffers(buffers: readonly ArrayBuffer[]): Uint8Array<ArrayBuffer> {
    const total = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const buf of buffers) {
        out.set(new Uint8Array(buf), offset);
        offset += buf.byteLength;
    }
    return out;
}

/** A solid as binary STL bytes. */
export function solidToStl(solid: Geom3): Uint8Array<ArrayBuffer> {
    return concatBuffers(serialize({ binary: true }, solid));
}

/** Tile(a, b) as binary STL bytes, ready to be written to a file. */
export function tileStl(
    a: number,
    b: number,
    opts: Partial<StlOptions> = {},
): Uint8Array<ArrayBuffer> {
    return solidToStl(tileSolid(a, b, { ...DEFAULT_STL_OPTIONS, ...opts }));
}

/** MIME type for STL, as used by the serializer. */
export const STL_MIME_TYPE = 'application/sla';

/** A self-describing filename for Tile(a, b), e.g. `tile-a1-b1.7321.stl`. */
export function stlFilename(a: number, b: number, mirrored = false): string {
    const suffix = mirrored ? '-mirrored' : '';
    return `tile-a${fmtNum(a)}-b${fmtNum(b)}${suffix}.stl`;
}
