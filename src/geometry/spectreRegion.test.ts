import { describe, expect, it } from 'vitest';
import { smithTileWorldVertices } from './smithTile';
import {
    MIRRORED_SPECTRE_REGIONS,
    regionMovableIndices,
    regionTiles,
    regionWormTiles,
    SPECTRE_REGIONS,
} from './spectreRegion';
import { ARTICULATED_WORMS } from './spectreWorm';
import { applyTransform } from './Transform';

function expectN2RearAttachedToETurtle(
    pb2: (typeof SPECTRE_REGIONS)['PB2'],
    boundaryIndex: number,
    dividerIndex: number,
): void {
    const boundary = pb2.worms[boundaryIndex];
    const divider = pb2.worms[dividerIndex];
    const e = boundary.worm.components?.find((component) => component.kind === 'E');
    expect(e).toBeDefined();
    if (!e) return;

    const targetVertices = smithTileWorldVertices(e.tiles[e.rear.tileIndex]).map((point) =>
        applyTransform(boundary.transform, point),
    );
    const dividerTiles = regionWormTiles(pb2, dividerIndex);
    const sourceVertices = smithTileWorldVertices(dividerTiles[divider.worm.rear.tileIndex]);

    for (const [sourceIndex, targetIndex] of [
        [3, 1],
        [4, 0],
        [5, 13],
    ] as const) {
        expect(sourceVertices[sourceIndex].x).toBeCloseTo(targetVertices[targetIndex].x, 10);
        expect(sourceVertices[sourceIndex].y).toBeCloseTo(targetVertices[targetIndex].y, 10);
    }

    const { m00, m01, m10, m11 } = divider.transform;
    expect(Math.hypot(m00, m10)).toBeCloseTo(1, 12);
    expect(Math.hypot(m01, m11)).toBeCloseTo(1, 12);
    expect(m00 * m11 - m01 * m10).toBeCloseTo(1, 12);
}

describe('PB2 partition workbench', () => {
    it('contains a PA2 boundary followed by two N2 divider worms', () => {
        const pb2 = SPECTRE_REGIONS.PB2;

        expect(pb2.kind).toBe('PB');
        expect(pb2.level).toBe(2);
        expect(pb2.worms.map(({ worm }) => worm.kind)).toEqual(['S', 'S', 'N', 'N']);
        expect(pb2.worms.slice(0, 2)).toEqual(SPECTRE_REGIONS.PA2.worms);
        expect(regionTiles(pb2)).toHaveLength(
            regionTiles(SPECTRE_REGIONS.PA2).length + ARTICULATED_WORMS.N2.tiles.length * 2,
        );
    });

    it('places each N2 rear on its corresponding E Turtle without reflection or scaling', () => {
        for (const pb2 of [SPECTRE_REGIONS.PB2, MIRRORED_SPECTRE_REGIONS.PB2]) {
            expectN2RearAttachedToETurtle(pb2, 0, 2);
            expectN2RearAttachedToETurtle(pb2, 1, 3);
        }
    });

    it('keeps PA2 fixed and exposes only the two dividers for manual placement', () => {
        expect(regionMovableIndices(SPECTRE_REGIONS.PB2)).toEqual([2, 3]);
    });
});
