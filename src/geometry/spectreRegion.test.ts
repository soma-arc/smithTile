import { describe, expect, it } from 'vitest';
import { smithTileWorldVertices } from './smithTile';
import {
    adjustRegionWorms,
    createArticulatedRegionLevels,
    createCoreSpectreRegionLevel,
    createPB,
    createTB,
    createTD,
    MIRRORED_SPECTRE_REGIONS,
    regionMovableIndices,
    regionTiles,
    regionWormTiles,
    SPECTRE_REGIONS,
    SPECTRE_REGION_EXPERIMENT_GROUPS,
    type SpectreRegion,
} from './spectreRegion';
import { ARTICULATED_WORMS, createArticulatedWormLevels } from './spectreWorm';
import { applyTransform, createReflectionTransform } from './Transform';

function expectNRearAttachedToETurtle(
    pb: SpectreRegion,
    boundaryIndex: number,
    dividerIndex: number,
): void {
    const boundary = pb.worms[boundaryIndex];
    const divider = pb.worms[dividerIndex];
    const e = boundary.worm.components?.find((component) => component.kind === 'E');
    expect(e).toBeDefined();
    if (!e) return;

    const targetVertices = smithTileWorldVertices(e.tiles[e.rear.tileIndex]).map((point) =>
        applyTransform(boundary.transform, point),
    );
    const dividerTiles = regionWormTiles(pb, dividerIndex);
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

function expectSFrontAttachedToMFrontS(
    tb: SpectreRegion,
    boundaryIndex: number,
    dividerIndex: number,
): void {
    const boundary = tb.worms[boundaryIndex];
    const divider = tb.worms[dividerIndex];
    const frontSideS = boundary.worm.components?.find((component) => component.kind === 'S');
    expect(frontSideS).toBeDefined();
    if (!frontSideS) return;

    const targetVertices = smithTileWorldVertices(frontSideS.tiles[frontSideS.rear.tileIndex]).map(
        (point) => applyTransform(boundary.transform, point),
    );
    const dividerTiles = regionWormTiles(tb, dividerIndex);
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

function expectMFrontAttachedToSFifthTile(
    td: SpectreRegion,
    boundaryIndex: number,
    dividerIndex: number,
): void {
    const boundary = td.worms[boundaryIndex];
    const divider = td.worms[dividerIndex];
    const frontSideS = boundary.worm.components?.find((component) => component.kind === 'S');
    expect(frontSideS).toBeDefined();
    if (!frontSideS) return;

    const targetTile = frontSideS.tiles[frontSideS.front.tileIndex + 4];
    expect(targetTile).toBeDefined();
    if (!targetTile) return;
    const targetVertices = smithTileWorldVertices(targetTile).map((point) =>
        applyTransform(boundary.transform, point),
    );
    const dividerTiles = regionWormTiles(td, dividerIndex);
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
            expectNRearAttachedToETurtle(pb2, 0, 2);
            expectNRearAttachedToETurtle(pb2, 1, 3);
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
            expectSFrontAttachedToMFrontS(tb2, 0, 3);
            expectSFrontAttachedToMFrontS(tb2, 1, 4);
            expectSFrontAttachedToMFrontS(tb2, 2, 5);
        }
    });

    it('keeps TA2 fixed and exposes only the three dividers for manual placement', () => {
        expect(regionMovableIndices(SPECTRE_REGIONS.TB2)).toEqual([3, 4, 5]);
    });
});

describe('TD2 partition workbench', () => {
    it('contains a TC2 boundary followed by three M1 divider worms', () => {
        const td2 = SPECTRE_REGIONS.TD2;

        expect(td2.kind).toBe('TD');
        expect(td2.level).toBe(2);
        expect(td2.worms.map(({ worm }) => worm.kind)).toEqual(['N', 'N', 'N', 'M', 'M', 'M']);
        expect(td2.worms.slice(0, 3)).toEqual(SPECTRE_REGIONS.TC2.worms);
        expect(regionTiles(td2)).toHaveLength(
            regionTiles(SPECTRE_REGIONS.TC2).length + ARTICULATED_WORMS.M1.tiles.length * 3,
        );
    });

    it('attaches each M1 front to the fifth tile of its corresponding S', () => {
        for (const td2 of [SPECTRE_REGIONS.TD2, MIRRORED_SPECTRE_REGIONS.TD2]) {
            for (let boundaryIndex = 0; boundaryIndex < 3; boundaryIndex++) {
                expectMFrontAttachedToSFifthTile(td2, boundaryIndex, boundaryIndex + 3);
            }
        }
    });

    it('keeps TC2 fixed and exposes only the three dividers for manual placement', () => {
        expect(regionMovableIndices(SPECTRE_REGIONS.TD2)).toEqual([3, 4, 5]);
    });
});

describe('PA2 child-region placement experiment', () => {
    it('contains the PA2 partition followed by one canonical TA2 candidate', () => {
        for (const regions of [SPECTRE_REGIONS, MIRRORED_SPECTRE_REGIONS]) {
            const experiment = regions['PA2-TA2'];
            expect(experiment.kind).toBe('PA');
            expect(experiment.level).toBe(2);
            expect(experiment.worms.map(({ worm }) => worm.kind)).toEqual([
                'S',
                'S',
                'N',
                'N',
                'M',
                'M',
                'M',
            ]);
            expect(experiment.worms.slice(0, 4)).toEqual(regions.PB2.worms);
            expect(experiment.worms.slice(4)).toEqual(regions.TA2.worms);
        }
    });

    it('provides rigid candidates for all three basic level-2 partitions', () => {
        for (const regions of [SPECTRE_REGIONS, MIRRORED_SPECTRE_REGIONS]) {
            const taExperiment = regions['TA2-TC2'];
            expect(taExperiment.worms.slice(0, 6)).toEqual(regions.TB2.worms);
            expect(taExperiment.worms.slice(6)).toEqual(regions.TC2.worms);
            expect(taExperiment.worms.map(({ worm }) => worm.kind)).toEqual([
                'M',
                'M',
                'M',
                'S',
                'S',
                'S',
                'N',
                'N',
                'N',
            ]);

            const tcExperiment = regions['TC2-PA1'];
            expect(tcExperiment.worms.slice(0, 6)).toEqual(regions.TD2.worms);
            expect(tcExperiment.worms.slice(6)).toEqual(regions.PA1.worms);
            expect(tcExperiment.worms.map(({ worm }) => worm.kind)).toEqual([
                'N',
                'N',
                'N',
                'M',
                'M',
                'M',
                'S',
                'S',
            ]);
        }
        expect(SPECTRE_REGION_EXPERIMENT_GROUPS).toEqual({
            'PA2-TA2': [{ id: 4, wormIndices: [4, 5, 6] }],
            'TA2-TC2': [{ id: 6, wormIndices: [6, 7, 8] }],
            'TC2-PA1': [{ id: 6, wormIndices: [6, 7] }],
        });
    });

    it('moves all three candidate worms as one rigid group', () => {
        const experiment = SPECTRE_REGIONS['PA2-TA2'];
        const adjusted = adjustRegionWorms(
            experiment,
            { 4: { translation: { x: 7, y: -3 }, rotationRad: 0 } },
            SPECTRE_REGION_EXPERIMENT_GROUPS['PA2-TA2'],
        );

        expect(adjusted.worms.slice(0, 4)).toEqual(experiment.worms.slice(0, 4));
        for (let index = 4; index <= 6; index++) {
            expect(adjusted.worms[index].transform.tx).toBeCloseTo(
                experiment.worms[index].transform.tx + 7,
                12,
            );
            expect(adjusted.worms[index].transform.ty).toBeCloseTo(
                experiment.worms[index].transform.ty - 3,
                12,
            );
        }
    });
});

describe('level-driven region creation', () => {
    const normalLevels = createArticulatedWormLevels(3);
    const mirroredLevels = createArticulatedWormLevels(3, createReflectionTransform());

    it('generates one region set per worm level and adds TB when S_(k-1) is available', () => {
        for (const wormLevels of [normalLevels, mirroredLevels]) {
            const regionLevels = createArticulatedRegionLevels(wormLevels);
            expect(regionLevels.map(({ level }) => level)).toEqual([1, 2, 3]);
            expect(regionLevels.map(({ TB }) => TB?.level)).toEqual([undefined, 2, 3]);
            expect(regionLevels.map(({ TD }) => TD?.level)).toEqual([undefined, 2, 3]);
            expect(regionLevels.map(({ PB }) => PB.level)).toEqual([1, 2, 3]);
        }
    });

    it('derives PA, TA, and TC levels from each worm level', () => {
        for (const levels of [normalLevels, mirroredLevels]) {
            for (const worms of levels) {
                const regions = createCoreSpectreRegionLevel(worms);
                expect(regions.level).toBe(worms.level);
                expect([regions.PA.kind, regions.TA.kind, regions.TC.kind]).toEqual([
                    'PA',
                    'TA',
                    'TC',
                ]);
                expect([regions.PA.level, regions.TA.level, regions.TC.level]).toEqual([
                    worms.level,
                    worms.level,
                    worms.level,
                ]);
                expect(regions.PA.worms.map(({ worm }) => worm.kind)).toEqual(['S', 'S']);
                expect(regions.TA.worms.map(({ worm }) => worm.kind)).toEqual(['M', 'M', 'M']);
                expect(regions.TC.worms.map(({ worm }) => worm.kind)).toEqual(['N', 'N', 'N']);
            }
        }
    });

    it('builds PB at levels 1 through 3 with the same rigid attachment rule', () => {
        for (const levels of [normalLevels, mirroredLevels]) {
            for (const worms of levels) {
                const pb = createPB(worms.S, worms.N);
                expect(pb.level).toBe(worms.level);
                expect(pb.worms.map(({ worm }) => worm.kind)).toEqual(['S', 'S', 'N', 'N']);
                expectNRearAttachedToETurtle(pb, 0, 2);
                expectNRearAttachedToETurtle(pb, 1, 3);
            }
        }
    });

    it('builds TB at levels 2 and 3 from the previous-level S worm', () => {
        for (const levels of [normalLevels, mirroredLevels]) {
            for (let index = 1; index < levels.length; index++) {
                const current = levels[index];
                const previous = levels[index - 1];
                const tb = createTB(current.M, previous.S);
                expect(tb.level).toBe(current.level);
                expect(tb.worms.map(({ worm }) => worm.kind)).toEqual([
                    'M',
                    'M',
                    'M',
                    'S',
                    'S',
                    'S',
                ]);
                expectSFrontAttachedToMFrontS(tb, 0, 3);
                expectSFrontAttachedToMFrontS(tb, 1, 4);
                expectSFrontAttachedToMFrontS(tb, 2, 5);
            }
        }
    });

    it('builds TD workbenches at levels 2 and 3 from the previous-level M worm', () => {
        for (const levels of [normalLevels, mirroredLevels]) {
            for (let index = 1; index < levels.length; index++) {
                const current = levels[index];
                const previous = levels[index - 1];
                const td = createTD(current.N, previous.M);
                expect(td.level).toBe(current.level);
                expect(td.worms.map(({ worm }) => worm.kind)).toEqual([
                    'N',
                    'N',
                    'N',
                    'M',
                    'M',
                    'M',
                ]);
                expect(regionMovableIndices(td)).toEqual([3, 4, 5]);
                for (let boundaryIndex = 0; boundaryIndex < 3; boundaryIndex++) {
                    expectMFrontAttachedToSFifthTile(td, boundaryIndex, boundaryIndex + 3);
                }
            }
        }
    });

    it('rejects inconsistent levels at region boundaries', () => {
        const [level1, level2, level3] = normalLevels;
        expect(() => createPB(level3.S, level2.N)).toThrow('same level');
        expect(() => createTB(level3.M, level1.S)).toThrow('Expected S at level 2');
        expect(() => createTB(level1.M, level1.S)).toThrow('worm level >= 2');
        expect(() => createTD(level3.N, level1.M)).toThrow('Expected M at level 2');
        expect(() => createTD(level1.N, level1.M)).toThrow('worm level >= 2');
    });
});
