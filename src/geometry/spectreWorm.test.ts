import { describe, expect, it } from 'vitest';
import { smithTileWorldVertices } from './smithTile';
import {
    ARTICULATED_WORM_KEYS,
    ARTICULATED_WORM_LEVELS,
    ARTICULATED_WORMS,
    concatWorms,
    createArticulatedWormLevels,
    MIRRORED_ARTICULATED_WORM_LEVELS,
    MIRRORED_SPECTRE_WORMS,
    SPECTRE_WORMS,
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
        expect(ARTICULATED_WORMS.I0.level).toBe(0);
        for (const worm of Object.values(ARTICULATED_WORMS)) {
            expect(worm.family).toBe('articulated');
            expect(worm.front.tileIndex).toBeGreaterThanOrEqual(0);
            expect(worm.front.tileIndex).toBeLessThan(worm.tiles.length);
            expect(worm.rear.tileIndex).toBeGreaterThanOrEqual(0);
            expect(worm.rear.tileIndex).toBeLessThan(worm.tiles.length);
        }
    });

    it('retains the existing level-1 and level-2 registry entries', () => {
        expect(ARTICULATED_WORM_LEVELS.map(({ level }) => level)).toEqual([1, 2]);
        expect(ARTICULATED_WORM_LEVELS[0].I).toBe(ARTICULATED_WORMS.I1);
        expect(ARTICULATED_WORM_LEVELS[0].S).toBe(ARTICULATED_WORMS.S1);
        expect(ARTICULATED_WORM_LEVELS[0].M).toBe(ARTICULATED_WORMS.M1);
        expect(ARTICULATED_WORM_LEVELS[0].N).toBe(ARTICULATED_WORMS.N1);
        expect(ARTICULATED_WORM_LEVELS[1].I).toBe(ARTICULATED_WORMS.I2);
        expect(ARTICULATED_WORM_LEVELS[1].S).toBe(ARTICULATED_WORMS.S2);
        expect(ARTICULATED_WORM_LEVELS[1].M).toBe(ARTICULATED_WORMS.M2);
        expect(ARTICULATED_WORM_LEVELS[1].N).toBe(ARTICULATED_WORMS.N2);
        expect(MIRRORED_ARTICULATED_WORM_LEVELS.map(({ level }) => level)).toEqual([1, 2]);
        expect([
            ARTICULATED_WORMS.I1.tiles.length,
            ARTICULATED_WORMS.S1.tiles.length,
            ARTICULATED_WORMS.M1.tiles.length,
            ARTICULATED_WORMS.N1.tiles.length,
            ARTICULATED_WORMS.I2.tiles.length,
            ARTICULATED_WORMS.S2.tiles.length,
            ARTICULATED_WORMS.M2.tiles.length,
            ARTICULATED_WORMS.N2.tiles.length,
        ]).toEqual([6, 9, 2, 1, 43, 106, 32, 24]);
    });

    it('generates level 3 from the same recurrence', () => {
        const levels = createArticulatedWormLevels(3);
        expect(levels.map(({ level }) => level)).toEqual([1, 2, 3]);

        const level3 = levels[2];
        expect([level3.I.kind, level3.S.kind, level3.M.kind, level3.N.kind]).toEqual([
            'I',
            'S',
            'M',
            'N',
        ]);
        for (const worm of [level3.I, level3.S, level3.M, level3.N]) {
            expect(worm.level).toBe(3);
            expect(worm.front.tileIndex).toBeGreaterThanOrEqual(0);
            expect(worm.front.tileIndex).toBeLessThan(worm.tiles.length);
            expect(worm.rear.tileIndex).toBeGreaterThanOrEqual(0);
            expect(worm.rear.tileIndex).toBeLessThan(worm.tiles.length);
        }
        expect(level3.I.components?.map(({ kind }) => kind)).toEqual([
            'O',
            'S',
            'I',
            'S',
            'I',
            'S',
            'E',
        ]);
        expect(level3.M.components?.map(({ kind }) => kind)).toEqual(['S', 'I', 'S', 'I', 'M']);
        expect(level3.N.components?.map(({ kind }) => kind)).toEqual(['S', 'I', 'S']);
    });

    it('rejects invalid maximum levels', () => {
        expect(createArticulatedWormLevels(0)).toEqual([]);
        expect(() => createArticulatedWormLevels(-1)).toThrow(/non-negative integer/);
        expect(() => createArticulatedWormLevels(1.5)).toThrow(/non-negative integer/);
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

describe('SPECTRE_WORMS', () => {
    it('rebuilds the same grammar from one Tile(1,1) prototile', () => {
        expect(Object.keys(SPECTRE_WORMS)).toEqual(ARTICULATED_WORM_KEYS);

        for (const [key, worm] of Object.entries(SPECTRE_WORMS)) {
            expect(worm.tiles).toHaveLength(
                ARTICULATED_WORMS[key as keyof typeof ARTICULATED_WORMS].tiles.length,
            );
            expect(worm.tiles.every((tile) => tile.shape.a === 1 && tile.shape.b === 1)).toBe(true);
            expect(
                MIRRORED_SPECTRE_WORMS[key as keyof typeof MIRRORED_SPECTRE_WORMS].tiles.every(
                    (tile) => tile.shape.a === 1 && tile.shape.b === 1,
                ),
            ).toBe(true);
        }

        const e = SPECTRE_WORMS.E;
        const parent = smithTileWorldVertices(e.tiles[0])[4];
        const child = smithTileWorldVertices(e.tiles[1])[12];
        expect(parent.x).toBeCloseTo(child.x, 10);
        expect(parent.y).toBeCloseTo(child.y, 10);
    });
});
