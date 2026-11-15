import { expect, it } from 'vitest';
import { smithTileWorldVertices } from '../geometry/smithTile';
import { getTileArticulatedPatch, MAX_TILE_PATCH_LEVEL } from '../geometry/tileArticulatedPatch';
import { CANVAS_H, CANVAS_W, createFittedCamera } from './camera';

it('fits both largest Hat/Turtle patches without clipping at the default zoom', () => {
    for (const tile of ['hat', 'turtle'] as const) {
        for (const kind of ['B', 'C'] as const) {
            const points = getTileArticulatedPatch(tile, kind, MAX_TILE_PATCH_LEVEL).tiles.flatMap(
                smithTileWorldVertices,
            );
            const camera = createFittedCamera(points);
            for (const point of points) {
                const screen = camera.project(point);
                expect(screen.x).toBeGreaterThan(0);
                expect(screen.x).toBeLessThan(CANVAS_W);
                expect(screen.y).toBeGreaterThan(0);
                expect(screen.y).toBeLessThan(CANVAS_H);
            }
        }
    }
});

it('handles the empty identity patch and applies pan in screen units', () => {
    const camera = createFittedCamera([{ x: 0, y: 0 }], 1, 0, { x: 13, y: -7 });
    expect(camera.project({ x: 0, y: 0 })).toEqual({ x: CANVAS_W / 2 + 13, y: CANVAS_H / 2 - 7 });
});
