import { describe, expect, it } from 'vitest';
import { smithTileWorldVertices } from './smithTile';
import {
    ARTICULATED_WORM_KEYS,
    ARTICULATED_WORMS,
    concatWorms,
    WORM_COLOR_MAP,
    wormColorGroups,
} from './spectreWorm';

function expectJoined(
    key: keyof typeof ARTICULATED_WORMS,
    parentTileIndex: number,
    parentVertexIndex: number,
    childTileIndex: number,
    childVertexIndex: number,
) {
    const worm = ARTICULATED_WORMS[key];
    const parent = smithTileWorldVertices(worm.tiles[parentTileIndex])[parentVertexIndex];
    const child = smithTileWorldVertices(worm.tiles[childTileIndex])[childVertexIndex];
    expect(parent.x).toBeCloseTo(child.x, 10);
    expect(parent.y).toBeCloseTo(child.y, 10);
}

describe('ARTICULATED_WORMS', () => {
    it('contains the atoms and every supported two-atom concatenation', () => {
        expect(ARTICULATED_WORM_KEYS).toEqual([
            'E',
            'O',
            'I0',
            'E:I0',
            'O:I0',
            'I0:E',
            'I0:O',
            'I0:I0',
            'I1',
            'S1',
            'I2',
            'S2',
            'M1',
            'N1',
            'M2',
            'N2',
        ]);
        expect(ARTICULATED_WORMS.E.tiles).toHaveLength(2);
        expect(ARTICULATED_WORMS.O.tiles).toHaveLength(2);
        expect(ARTICULATED_WORMS.I0.tiles).toHaveLength(1);
        for (const key of ARTICULATED_WORM_KEYS.slice(3)) {
            expect(ARTICULATED_WORMS[key].components?.length).toBeGreaterThan(0);
        }
    });

    it('tracks the atom kinds and valid end tile indexes', () => {
        expect(ARTICULATED_WORMS.I0.kind).toBe('I0');
        for (const worm of Object.values(ARTICULATED_WORMS)) {
            expect(worm.family).toBe('articulated');
            expect(worm.front.tileIndex).toBeGreaterThanOrEqual(0);
            expect(worm.front.tileIndex).toBeLessThan(worm.tiles.length);
            expect(worm.rear.tileIndex).toBeGreaterThanOrEqual(0);
            expect(worm.rear.tileIndex).toBeLessThan(worm.tiles.length);
        }
    });

    it('places both tiles of E and O at their shared anchor', () => {
        expectJoined('E', 0, 4, 1, 12);
        expectJoined('O', 0, 4, 1, 12);
    });

    it('places each concatenated atom at the configured join', () => {
        expectJoined('E:I0', 1, 4, 2, 10);
        expectJoined('O:I0', 1, 6, 2, 10);
        expectJoined('I0:E', 0, 6, 1, 0);
        expectJoined('I0:O', 0, 4, 1, 10);
        expectJoined('I0:I0', 0, 4, 1, 10);
    });

    it('partitions every worm into placed color components', () => {
        const tileKey = (tile: (typeof ARTICULATED_WORMS.E.tiles)[number]) =>
            smithTileWorldVertices(tile)
                .map((point) => `${point.x.toFixed(6)},${point.y.toFixed(6)}`)
                .join('|');

        for (const worm of Object.values(ARTICULATED_WORMS)) {
            const groups = wormColorGroups(worm);
            expect(groups.length).toBeGreaterThan(0);
            expect(
                groups
                    .flatMap((group) => group.tiles)
                    .map(tileKey)
                    .sort(),
            ).toEqual(worm.tiles.map(tileKey).sort());
        }

        const groups = wormColorGroups(ARTICULATED_WORMS['E:I0']);
        expect(groups.map(({ fill, tiles }) => [fill, tiles.length])).toEqual([
            [WORM_COLOR_MAP.E, 2],
            [WORM_COLOR_MAP.I0, 1],
        ]);
    });

    it('colors the first named worms one semantic level below the root', () => {
        expect(wormColorGroups(ARTICULATED_WORMS.I2).map((group) => group.fill)).toEqual([
            WORM_COLOR_MAP.O,
            WORM_COLOR_MAP.S,
            WORM_COLOR_MAP.I,
            WORM_COLOR_MAP.S,
            WORM_COLOR_MAP.I,
            WORM_COLOR_MAP.S,
            WORM_COLOR_MAP.E,
        ]);
        expect(wormColorGroups(ARTICULATED_WORMS.M2).map((group) => group.fill)).toEqual([
            WORM_COLOR_MAP.S,
            WORM_COLOR_MAP.I,
            WORM_COLOR_MAP.S,
            WORM_COLOR_MAP.I,
            WORM_COLOR_MAP.M,
        ]);
        expect(wormColorGroups(ARTICULATED_WORMS.N2).map((group) => group.fill)).toEqual([
            WORM_COLOR_MAP.S,
            WORM_COLOR_MAP.I,
            WORM_COLOR_MAP.S,
        ]);
        expect(wormColorGroups(ARTICULATED_WORMS.M1).map((group) => group.fill)).toEqual([
            WORM_COLOR_MAP.I0,
            WORM_COLOR_MAP.I0,
        ]);
    });

    it('concatenates named worms as a flat list of direct components', () => {
        const combined = concatWorms([ARTICULATED_WORMS.I1, ARTICULATED_WORMS.S1]);
        expect(combined.components?.map((component) => component.kind)).toEqual(['I', 'S']);
        expect(combined.tiles).toHaveLength(
            ARTICULATED_WORMS.I1.tiles.length + ARTICULATED_WORMS.S1.tiles.length,
        );
        expect(wormColorGroups(combined).map((group) => group.fill)).toEqual([
            WORM_COLOR_MAP.I,
            WORM_COLOR_MAP.S,
        ]);
    });
});
