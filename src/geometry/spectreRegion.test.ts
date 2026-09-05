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

function expectS1FrontAttachedToMFrontS(
    tb2: (typeof SPECTRE_REGIONS)['TB2'],
    boundaryIndex: number,
    dividerIndex: number,
): void {
    const boundary = tb2.worms[boundaryIndex];
    const divider = tb2.worms[dividerIndex];
    const frontSideS = boundary.worm.components?.find((component) => component.kind === 'S');
    expect(frontSideS).toBeDefined();
    if (!frontSideS) return;

    const targetVertices = smithTileWorldVertices(frontSideS.tiles[frontSideS.rear.tileIndex]).map(
        (point) => applyTransform(boundary.transform, point),
    );
    const dividerTiles = regionWormTiles(tb2, dividerIndex);
    const sourceVertices = smithTileWorldVertices(dividerTiles[divider.worm.front.tileIndex]);

    for (const [sourceIndex, targetIndex] of [
        [0, 0],
        [13, 1],
        [12, 2],
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

describe('TB2 partition workbench', () => {
    it('contains a TA2 boundary followed by three S1 divider worms', () => {
        const tb2 = SPECTRE_REGIONS.TB2;

        expect(tb2.kind).toBe('TB');
        expect(tb2.level).toBe(2);
        expect(tb2.worms.map(({ worm }) => worm.kind)).toEqual(['M', 'M', 'M', 'S', 'S', 'S']);
        expect(tb2.worms.slice(0, 3)).toEqual(SPECTRE_REGIONS.TA2.worms);
        expect(regionTiles(tb2)).toHaveLength(
            regionTiles(SPECTRE_REGIONS.TA2).length + ARTICULATED_WORMS.S1.tiles.length * 3,
        );
    });

    it('places each S1 front on its corresponding M2 front-side S rear', () => {
        for (const tb2 of [SPECTRE_REGIONS.TB2, MIRRORED_SPECTRE_REGIONS.TB2]) {
            expectS1FrontAttachedToMFrontS(tb2, 0, 3);
            expectS1FrontAttachedToMFrontS(tb2, 1, 4);
            expectS1FrontAttachedToMFrontS(tb2, 2, 5);
        }
    });

    it('keeps TA2 fixed and exposes only the three dividers for manual placement', () => {
        expect(regionMovableIndices(SPECTRE_REGIONS.TB2)).toEqual([3, 4, 5]);
    });
});
