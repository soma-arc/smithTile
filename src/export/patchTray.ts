import { expansions, extrusions, geometries, transforms } from '@jscad/modeling';
import type { Geom2, Geom3 } from '@jscad/modeling/src/geometries/types';
import type { SmithPatch } from '../geometry/smithPatch';
import { type CurveSpec, type SmithTile, STRAIGHT_CURVE } from '../geometry/smithTile';
import type { Vec2 } from '../geometry/Vec2';
import { DEFAULT_CURVE_TOLERANCE_MM, tileCurveOutline } from './curveTessellation';
import { ccwPolygon } from './insetPolygon';
import { classifyPatchStlError, PatchStlValidationError } from './patchStlError';
import type { PatchStlOptions } from './patchStl';
import { cleanPolygon } from './polygon2d';
import { solidToStl } from './stl';

export type PatchTrayOptions = {
    /** Shape of the outside edge and the full base. */
    outerShape: 'silhouette' | 'rectangle';
    /** Radial space between the patch and the tray wall, in mm. */
    clearance: number;
    /** Width of the wall measured outwards from the cavity, in mm. */
    frameWidth: number;
    /** Thickness of the floor below the patch, in mm. */
    baseThickness: number;
    /** Wall height above the top of the floor, in mm. */
    wallHeight: number;
};

export const DEFAULT_PATCH_TRAY_OPTIONS: PatchTrayOptions = {
    outerShape: 'silhouette',
    clearance: 0.25,
    frameWidth: 3,
    baseThickness: 1.2,
    wallHeight: 4,
};

type FootprintOptions = {
    unitMm: number;
    edgeCurve: CurveSpec;
    curveToleranceMm: number;
};

function resolveFootprintOptions(options: Partial<PatchStlOptions>): FootprintOptions {
    return {
        unitMm: options.unitMm ?? 10,
        edgeCurve: options.edgeCurve ?? STRAIGHT_CURVE,
        curveToleranceMm: options.curveToleranceMm ?? DEFAULT_CURVE_TOLERANCE_MM,
    };
}

function tileOutlineMm(tile: SmithTile, options: FootprintOptions): Vec2[] {
    return tileCurveOutline(
        tile,
        options.edgeCurve,
        options.curveToleranceMm / options.unitMm,
    ).map((point) => ({ x: point.x * options.unitMm, y: point.y * options.unitMm }));
}

/**
 * Build a 2D patch footprint by cancelling every oppositely directed shared
 * edge. This keeps the operation linear in the number of tile outline points,
 * instead of applying a BSP union to every tile.
 */
export function patchFootprint(
    patch: Pick<SmithPatch, 'tiles'>,
    options: Partial<PatchStlOptions> = {},
): Geom2 {
    const resolved = resolveFootprintOptions(options);
    if (patch.tiles.length === 0) throw new PatchStlValidationError('emptyPatch');
    if (!Number.isFinite(resolved.unitMm) || resolved.unitMm <= 0) {
        throw new PatchStlValidationError('invalidScale');
    }
    if (!Number.isFinite(resolved.curveToleranceMm) || resolved.curveToleranceMm <= 0) {
        throw new PatchStlValidationError('invalidTolerance');
    }

    const weldTolerance = resolved.unitMm * 1e-8;
    const buckets = new Map<string, Vec2[]>();
    const weld = (point: Vec2): Vec2 => {
        const x = Math.floor(point.x / weldTolerance);
        const y = Math.floor(point.y / weldTolerance);
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (const candidate of buckets.get(`${x + dx},${y + dy}`) ?? []) {
                    if (Math.hypot(point.x - candidate.x, point.y - candidate.y) <= weldTolerance) {
                        return candidate;
                    }
                }
            }
        }
        const key = `${x},${y}`;
        const bucket = buckets.get(key) ?? [];
        bucket.push(point);
        buckets.set(key, bucket);
        return point;
    };
    const pointKey = (point: Vec2) => `${point.x},${point.y}`;
    const boundary = new Map<string, [Vec2, Vec2]>();
    const paired = new Set<string>();

    for (const tile of patch.tiles) {
        const outline = tileOutlineMm(tile, resolved).map(weld);
        ccwPolygon(outline);
        const area2 = outline.reduce((sum, point, index) => {
            const next = outline[(index + 1) % outline.length];
            return sum + point.x * next.y - point.y * next.x;
        }, 0);
        if (area2 < 0) outline.reverse();
        for (let index = 0; index < outline.length; index++) {
            const start = outline[index];
            const end = outline[(index + 1) % outline.length];
            const key = `${pointKey(start)}|${pointKey(end)}`;
            const opposite = `${pointKey(end)}|${pointKey(start)}`;
            if (boundary.has(key) || paired.has(key) || paired.has(opposite)) {
                throw new RangeError('Patch contains duplicate or overlapping tile edges');
            }
            if (boundary.has(opposite)) {
                boundary.delete(opposite);
                paired.add(key);
            } else {
                boundary.set(key, [start, end]);
            }
        }
    }

    return geometries.geom2.create(
        [...boundary.values()].map(([start, end]) => [
            [start.x, start.y],
            [end.x, end.y],
        ]),
    );
}

function validateTrayOptions(options: PatchTrayOptions): void {
    if (options.outerShape !== 'silhouette' && options.outerShape !== 'rectangle') {
        throw new PatchStlValidationError('invalidTrayShape');
    }
    if (!Number.isFinite(options.clearance) || options.clearance < 0) {
        throw new PatchStlValidationError('invalidClearance');
    }
    if (!Number.isFinite(options.frameWidth) || options.frameWidth <= 0) {
        throw new PatchStlValidationError('invalidFrameWidth');
    }
    if (!Number.isFinite(options.baseThickness) || options.baseThickness <= 0) {
        throw new PatchStlValidationError('invalidBaseThickness');
    }
    if (!Number.isFinite(options.wallHeight) || options.wallHeight <= 0) {
        throw new PatchStlValidationError('invalidWallHeight');
    }
}

function cleanOffset(geometry: Geom2): Geom2 {
    const sides = geometries.geom2.toOutlines(geometry).flatMap((outline) => {
        const points = cleanPolygon(
            outline.map(([x, y]) => ({ x, y })),
            1e-6,
        );
        return points.map((point, index) => {
            const next = points[(index + 1) % points.length];
            return [
                [point.x, point.y],
                [next.x, next.y],
            ] as [[number, number], [number, number]];
        });
    });
    return geometries.geom2.create(sides);
}

export function patchTraySolid(
    patch: Pick<SmithPatch, 'tiles'>,
    patchOptions: Partial<PatchStlOptions> = {},
    trayOptions: Partial<PatchTrayOptions> = {},
): Geom3 {
    const options = { ...DEFAULT_PATCH_TRAY_OPTIONS, ...trayOptions };
    validateTrayOptions(options);
    const footprint = patchFootprint(patch, patchOptions);
    const cavity = cleanOffset(
        expansions.offset({ delta: options.clearance, corners: 'edge' }, footprint) as Geom2,
    );
    const outside =
        options.outerShape === 'rectangle'
            ? (() => {
                  const outlines = geometries.geom2.toOutlines(footprint);
                  const points = outlines.flat();
                  const margin = options.clearance + options.frameWidth;
                  const minX = Math.min(...points.map(([x]) => x)) - margin;
                  const maxX = Math.max(...points.map(([x]) => x)) + margin;
                  const minY = Math.min(...points.map(([, y]) => y)) - margin;
                  const maxY = Math.max(...points.map(([, y]) => y)) + margin;
                  return geometries.geom2.fromPoints([
                      [minX, minY],
                      [maxX, minY],
                      [maxX, maxY],
                      [minX, maxY],
                  ]);
              })()
            : cleanOffset(
                  expansions.offset(
                      { delta: options.clearance + options.frameWidth, corners: 'edge' },
                      footprint,
                  ) as Geom2,
              );
    const floor = extrusions.extrudeLinear({ height: options.baseThickness }, outside);
    const wall2d = geometries.geom2.create([
        ...geometries.geom2.toSides(outside),
        ...geometries.geom2
            .toSides(cavity)
            .map(([start, end]): [[number, number], [number, number]] => [end, start]),
    ]);
    const wall = transforms.translateZ(
        options.baseThickness,
        extrusions.extrudeLinear({ height: options.wallHeight }, wall2d),
    );
    const cavityFloor = extrusions.extrudeLinear(
        { height: options.baseThickness },
        cavity,
    );
    const atHeight = (polygon: ReturnType<typeof geometries.geom3.toPolygons>[number], z: number) =>
        polygon.vertices.every((vertex) => Math.abs(vertex[2] - z) <= 1e-6);
    return geometries.geom3.create([
        ...geometries.geom3
            .toPolygons(floor)
            .filter((polygon) => !atHeight(polygon, options.baseThickness)),
        ...geometries.geom3
            .toPolygons(wall)
            .filter((polygon) => !atHeight(polygon, options.baseThickness)),
        ...geometries.geom3
            .toPolygons(cavityFloor)
            .filter((polygon) => atHeight(polygon, options.baseThickness)),
    ]);
}

export function patchTrayStl(
    patch: Pick<SmithPatch, 'tiles'>,
    patchOptions: Partial<PatchStlOptions> = {},
    trayOptions: Partial<PatchTrayOptions> = {},
): Uint8Array<ArrayBuffer> {
    try {
        return solidToStl(patchTraySolid(patch, patchOptions, trayOptions));
    } catch (error) {
        if (error instanceof RangeError) {
            throw new PatchStlValidationError(classifyPatchStlError(error), error.message);
        }
        throw error;
    }
}
