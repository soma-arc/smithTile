import { expansions, measurements } from '@jscad/modeling';
import { describe, expect, it } from 'vitest';
import { SPECTRE_PATCHES } from '../geometry/smithPatch';
import { PatchStlValidationError } from './patchStlError';
import {
    DEFAULT_PATCH_TRAY_OPTIONS,
    patchFootprint,
    patchTraySolid,
    patchTrayStl,
} from './patchTray';

function expectClosed(bytes: Uint8Array<ArrayBuffer>) {
    const view = new DataView(bytes.buffer);
    const count = view.getUint32(80, true);
    const edges = new Map<string, number>();
    const point = (triangle: number, vertex: number) => {
        const start = 84 + triangle * 50 + 12 + vertex * 12;
        return [0, 4, 8]
            .map((offset) => view.getFloat32(start + offset, true).toFixed(5))
            .join(',');
    };
    for (let triangle = 0; triangle < count; triangle++) {
        const points = [0, 1, 2].map((vertex) => point(triangle, vertex));
        for (let index = 0; index < 3; index++) {
            const edge = [points[index], points[(index + 1) % 3]].sort().join('|');
            edges.set(edge, (edges.get(edge) ?? 0) + 1);
        }
    }
    expect([...edges.entries()].filter(([, uses]) => uses !== 2)).toEqual([]);
}

describe('patch silhouette tray', () => {
    it('creates a closed frame and full base with the requested volume', () => {
        const patch = SPECTRE_PATCHES.N0;
        const patchOptions = { unitMm: 10, thickness: 4, bevel: 0.8 };
        const trayOptions = {
            clearance: 0.25,
            frameWidth: 3,
            baseThickness: 1.2,
            wallHeight: 4,
        };
        const footprint = patchFootprint(patch, patchOptions);
        const cavity = expansions.offset({ delta: trayOptions.clearance }, footprint);
        const outside = expansions.offset(
            { delta: trayOptions.clearance + trayOptions.frameWidth },
            footprint,
        );
        const expectedVolume =
            measurements.measureArea(outside) * trayOptions.baseThickness +
            (measurements.measureArea(outside) - measurements.measureArea(cavity)) *
                trayOptions.wallHeight;
        const solid = patchTraySolid(patch, patchOptions, trayOptions);

        const bytes = patchTrayStl(patch, patchOptions, trayOptions);
        expectClosed(bytes);
        expect(measurements.measureVolume(solid)).toBeCloseTo(expectedVolume, 3);
        expect(bytes.byteLength).toBeGreaterThan(84);
    });

    it('uses printable defaults and rejects invalid tray dimensions', () => {
        expect(DEFAULT_PATCH_TRAY_OPTIONS.clearance).toBeGreaterThanOrEqual(0);
        expect(DEFAULT_PATCH_TRAY_OPTIONS.frameWidth).toBeGreaterThan(0);
        expect(() =>
            patchTraySolid(SPECTRE_PATCHES.N0, {}, { frameWidth: 0 }),
        ).toThrowError(PatchStlValidationError);
    });

    it('can use an axis-aligned rectangular outside while retaining the patch cavity', () => {
        const patch = SPECTRE_PATCHES.N0;
        const patchOptions = { unitMm: 10, thickness: 4, bevel: 0.8 };
        const margin = 0.25 + 3;
        const footprintBounds = measurements.measureBoundingBox(
            patchFootprint(patch, patchOptions),
        );
        const solid = patchTraySolid(patch, patchOptions, {
            outerShape: 'rectangle',
            clearance: 0.25,
            frameWidth: 3,
            baseThickness: 1.2,
            wallHeight: 4,
        });
        const bounds = measurements.measureBoundingBox(solid);

        expect(bounds[0][0]).toBeCloseTo(footprintBounds[0][0] - margin, 5);
        expect(bounds[0][1]).toBeCloseTo(footprintBounds[0][1] - margin, 5);
        expect(bounds[1][0]).toBeCloseTo(footprintBounds[1][0] + margin, 5);
        expect(bounds[1][1]).toBeCloseTo(footprintBounds[1][1] + margin, 5);
        expect(bounds[1][2]).toBeCloseTo(5.2, 5);
        expectClosed(
            patchTrayStl(patch, patchOptions, {
                outerShape: 'rectangle',
                clearance: 0.25,
                frameWidth: 3,
                baseThickness: 1.2,
                wallHeight: 4,
            }),
        );
    });
});
