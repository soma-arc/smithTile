/** Two-dimensional regions assembled from canonical Conway worms. */

import { getPortFromVertex, type Port, transformPort } from './smithPatch';
import { type SmithTile, smithTileWorldVertices } from './smithTile';
import {
    ARTICULATED_WORM_LEVELS,
    type ArticulatedWormLevel,
    MIRRORED_ARTICULATED_WORM_LEVELS,
    type NamedWorm,
    WORM_COLOR_MAP,
    type WormAtomKind,
    type WormKind,
} from './spectreWorm';
import {
    applyTransform,
    composeTransforms,
    createTransform,
    IDENTITY_TRANSFORM,
    type Transform,
} from './Transform';
import { subVec2, type Vec2 } from './Vec2';

export type PlacedWorm = {
    worm: NamedWorm;
    transform: Transform;
};

export type RegionKind = 'PA' | 'TA' | 'TC' | 'PB' | 'TB';

export type SpectreRegion = {
    kind: RegionKind;
    level: number;
    worms: readonly PlacedWorm[];
    transform: Transform;
};

export type WormAdjustment = { translation: Vec2; rotationRad: number };

function assertKind(worm: NamedWorm, expected: WormKind): void {
    if (worm.kind !== expected) {
        throw new Error(`Expected ${expected} worm, got ${worm.kind}`);
    }
}

function assertLevel(worm: NamedWorm, minimum = 1): void {
    if (!Number.isInteger(worm.level) || worm.level < minimum) {
        throw new Error(`Expected worm level >= ${minimum}, got ${worm.level}`);
    }
}

function assertSameLevel(first: NamedWorm, second: NamedWorm): void {
    if (first.level !== second.level) {
        throw new Error(`Expected worms at the same level, got ${first.level} and ${second.level}`);
    }
}

function assertPortCandidate(
    tile: SmithTile,
    vertexIndex: number,
    expected: 'socket' | 'plug',
): void {
    const actual = tile.shape.vertices[vertexIndex]?.portCandidate;
    if (actual !== expected) {
        throw new Error(`Expected ${expected} at vertex ${vertexIndex}, got ${actual ?? 'none'}`);
    }
}

function findOnlyDirectComponent(worm: NamedWorm, kind: WormAtomKind | WormKind): NamedWorm {
    const matches = worm.components?.filter((component) => component.kind === kind) ?? [];
    if (matches.length !== 1) {
        throw new Error(`Expected exactly one direct ${kind} component, got ${matches.length}`);
    }
    return matches[0];
}

/** PA junction on the first S: vertex 12 of the Turtle in its direct O component. */
function paOTurtleSocket(s: NamedWorm): Port {
    assertKind(s, 'S');
    const o = findOnlyDirectComponent(s, 'O');
    const turtle = o.tiles[o.front.tileIndex];
    assertPortCandidate(turtle, 12, 'socket');
    return getPortFromVertex(turtle, 12);
}

/** PA junction on the second S: vertex 12 of its front terminal tile. */
function paFrontSocket(s: NamedWorm): Port {
    assertKind(s, 'S');
    const front = s.tiles[s.front.tileIndex];
    assertPortCandidate(front, 12, 'socket');
    return getPortFromVertex(front, 12);
}

function wormFrontSocket(worm: NamedWorm): Port {
    const front = worm.tiles[worm.front.tileIndex];
    assertPortCandidate(front, 12, 'socket');
    return getPortFromVertex(front, 12);
}

function coincidentSockets(s: NamedWorm, position: Vec2): Port[] {
    const sockets: Port[] = [];
    for (const tile of s.tiles) {
        tile.shape.vertices.forEach((vertex, vertexIndex) => {
            if (vertex.portCandidate !== 'socket') return;
            const port = getPortFromVertex(tile, vertexIndex);
            if (Math.hypot(port.position.x - position.x, port.position.y - position.y) < 1e-6) {
                sockets.push(port);
            }
        });
    }
    return sockets;
}

function socketPlacementTransform(
    targetPosition: Vec2,
    targetAngle: number,
    child: Port,
): Transform {
    const rotationRad = targetAngle - child.inwardAngleRad;
    const rotation = createTransform({ x: 0, y: 0 }, rotationRad);
    const rotatedChild = applyTransform(rotation, child.position);
    return createTransform(subVec2(targetPosition, rotatedChild), rotationRad);
}

/** Place the third 120° socket into the sector left open by two existing sockets. */
function tripleSocketTransform(existing: readonly Port[], childSocket: Port): Transform {
    if (existing.length !== 2) {
        throw new Error(`Expected two sockets at region junction, got ${existing.length}`);
    }
    const [first, second] = existing;
    if (
        Math.hypot(first.position.x - second.position.x, first.position.y - second.position.y) >
        1e-6
    ) {
        throw new Error('Region junction sockets do not share a position');
    }
    const missingDirection = {
        x: -existing.reduce((sum, port) => sum + Math.cos(port.inwardAngleRad), 0),
        y: -existing.reduce((sum, port) => sum + Math.sin(port.inwardAngleRad), 0),
    };
    if (Math.hypot(missingDirection.x, missingDirection.y) < 1e-6) {
        throw new Error('Cannot determine the open 120-degree sector at region junction');
    }
    const targetAngle = Math.atan2(missingDirection.y, missingDirection.x);
    return socketPlacementTransform(first.position, targetAngle, childSocket);
}

function assertTripleSocketJunction(existing: readonly Port[], third: Port): void {
    if (existing.length !== 2) {
        throw new Error(`Expected two sockets before region closure, got ${existing.length}`);
    }
    const sockets = [...existing, third];
    const origin = sockets[0].position;
    if (
        sockets.some(
            (socket) =>
                Math.hypot(socket.position.x - origin.x, socket.position.y - origin.y) > 1e-6,
        )
    ) {
        throw new Error('Region closure sockets do not share a position');
    }
    const directionSum = sockets.reduce(
        (sum, socket) => ({
            x: sum.x + Math.cos(socket.inwardAngleRad),
            y: sum.y + Math.sin(socket.inwardAngleRad),
        }),
        { x: 0, y: 0 },
    );
    if (Math.hypot(directionSum.x, directionSum.y) > 1e-6) {
        throw new Error('Region closure sockets are not spaced by 120 degrees');
    }
}

function paAttachmentTransform(parent: NamedWorm, child: NamedWorm): Transform {
    const parentSocket = paOTurtleSocket(parent);
    return tripleSocketTransform(
        coincidentSockets(parent, parentSocket.position),
        paFrontSocket(child),
    );
}

export function createPA(s: NamedWorm): SpectreRegion {
    assertKind(s, 'S');
    assertLevel(s);
    const first: PlacedWorm = { worm: s, transform: IDENTITY_TRANSFORM };
    const secondTransform = paAttachmentTransform(first.worm, s);
    const second: PlacedWorm = { worm: s, transform: secondTransform };

    return {
        kind: 'PA',
        level: s.level,
        worms: [first, second],
        transform: IDENTITY_TRANSFORM,
    };
}

function taRearSideJunction(m: NamedWorm): readonly [Port, Port] {
    assertKind(m, 'M');
    const components = m.components ?? [];
    let rearSideSIndex = -1;
    for (let index = components.length - 1; index >= 0; index--) {
        if (components[index].kind === 'S') {
            rearSideSIndex = index;
            break;
        }
    }
    const rearSideS = components[rearSideSIndex];
    const followingI = components[rearSideSIndex + 1];
    if (!rearSideS || followingI?.kind !== 'I') {
        throw new Error('Expected rear-side S followed by I in M worm');
    }
    const rearTile = rearSideS.tiles[rearSideS.rear.tileIndex];
    const frontTile = followingI.tiles[followingI.front.tileIndex];
    assertPortCandidate(rearTile, 2, 'socket');
    assertPortCandidate(frontTile, 12, 'socket');
    const rearSocket = getPortFromVertex(rearTile, 2);
    const frontSocket = getPortFromVertex(frontTile, 12);
    if (
        Math.hypot(
            rearSocket.position.x - frontSocket.position.x,
            rearSocket.position.y - frontSocket.position.y,
        ) > 1e-6
    ) {
        throw new Error('Expected S.rear(2) and I.front(12) to share the TA junction');
    }
    return [rearSocket, frontSocket];
}

function createTriadAtFront(kind: 'TA' | 'TC', worm: NamedWorm): SpectreRegion {
    const anchor = wormFrontSocket(worm);
    const secondTransform = socketPlacementTransform(
        anchor.position,
        anchor.inwardAngleRad + (Math.PI * 2) / 3,
        wormFrontSocket(worm),
    );
    const thirdTransform = socketPlacementTransform(
        anchor.position,
        anchor.inwardAngleRad - (Math.PI * 2) / 3,
        wormFrontSocket(worm),
    );
    return {
        kind,
        level: worm.level,
        worms: [
            { worm, transform: IDENTITY_TRANSFORM },
            { worm, transform: secondTransform },
            { worm, transform: thirdTransform },
        ],
        transform: IDENTITY_TRANSFORM,
    };
}

export function createTA(m: NamedWorm): SpectreRegion {
    assertKind(m, 'M');
    assertLevel(m);
    if (m.level === 1) return createTriadAtFront('TA', m);

    const first: PlacedWorm = { worm: m, transform: IDENTITY_TRANSFORM };
    const secondTransform = tripleSocketTransform(taRearSideJunction(m), wormFrontSocket(m));
    const second: PlacedWorm = { worm: m, transform: secondTransform };
    const secondJunction = taRearSideJunction(m).map((port) =>
        transformPort(secondTransform, port),
    );
    const thirdTransform = tripleSocketTransform(secondJunction, wormFrontSocket(m));
    const thirdJunction = taRearSideJunction(m).map((port) => transformPort(thirdTransform, port));
    assertTripleSocketJunction(thirdJunction, wormFrontSocket(m));
    return {
        kind: 'TA',
        level: m.level,
        worms: [first, second, { worm: m, transform: thirdTransform }],
        transform: IDENTITY_TRANSFORM,
    };
}

function tcFrontSideJunction(n: NamedWorm): readonly [Port, Port] {
    assertKind(n, 'N');
    const components = n.components ?? [];
    const frontSideSIndex = components.findIndex((component) => component.kind === 'S');
    const frontSideS = components[frontSideSIndex];
    const followingI = components[frontSideSIndex + 1];
    if (!frontSideS || followingI?.kind !== 'I') {
        throw new Error('Expected front-side S followed by I in N worm');
    }
    const rearTile = frontSideS.tiles[frontSideS.rear.tileIndex];
    const frontTile = followingI.tiles[followingI.front.tileIndex];
    assertPortCandidate(rearTile, 2, 'socket');
    assertPortCandidate(frontTile, 12, 'socket');
    const sSocket = getPortFromVertex(rearTile, 2);
    const iSocket = getPortFromVertex(frontTile, 12);
    if (
        Math.hypot(
            sSocket.position.x - iSocket.position.x,
            sSocket.position.y - iSocket.position.y,
        ) > 1e-6
    ) {
        throw new Error('Expected front S.rear(2) and I.front(12) to share the TC junction');
    }
    return [sSocket, iSocket];
}

export function createTC(n: NamedWorm): SpectreRegion {
    assertKind(n, 'N');
    assertLevel(n);
    if (n.level === 1) return createTriadAtFront('TC', n);

    const first: PlacedWorm = { worm: n, transform: IDENTITY_TRANSFORM };
    const secondTransform = tripleSocketTransform(tcFrontSideJunction(n), wormFrontSocket(n));
    const second: PlacedWorm = { worm: n, transform: secondTransform };
    const secondJunction = tcFrontSideJunction(n).map((port) =>
        transformPort(secondTransform, port),
    );
    const thirdTransform = tripleSocketTransform(secondJunction, wormFrontSocket(n));
    const thirdJunction = tcFrontSideJunction(n).map((port) => transformPort(thirdTransform, port));
    assertTripleSocketJunction(thirdJunction, wormFrontSocket(n));
    return {
        kind: 'TC',
        level: n.level,
        worms: [first, second, { worm: n, transform: thirdTransform }],
        transform: IDENTITY_TRANSFORM,
    };
}

function placedTiles(
    region: SpectreRegion,
    placed: PlacedWorm,
    tiles: readonly SmithTile[],
): SmithTile[] {
    return tiles.map((tile) => ({
        ...tile,
        transform: composeTransforms(
            region.transform,
            composeTransforms(placed.transform, tile.transform),
        ),
    }));
}

function placedWormTiles(region: SpectreRegion, placed: PlacedWorm): SmithTile[] {
    return placedTiles(region, placed, placed.worm.tiles);
}

export function regionTiles(region: SpectreRegion): SmithTile[] {
    return region.worms.flatMap((placed) => placedWormTiles(region, placed));
}

export function regionWormTiles(region: SpectreRegion, index: number): SmithTile[] {
    const placed = region.worms[index];
    if (!placed) throw new Error(`Region worm index out of range: ${index}`);
    return placedWormTiles(region, placed);
}

function averagePosition(tiles: readonly SmithTile[]): Vec2 {
    const points = tiles.flatMap((tile) => smithTileWorldVertices(tile));
    const total = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), {
        x: 0,
        y: 0,
    });
    return { x: total.x / points.length, y: total.y / points.length };
}

export function regionWormPivot(region: SpectreRegion, index: number): Vec2 {
    const placed = region.worms[index];
    if (!placed) throw new Error(`Region worm index out of range: ${index}`);
    if (region.kind === 'PA' && index === 1) {
        return transformPort(placed.transform, paFrontSocket(placed.worm)).position;
    }
    return averagePosition(regionWormTiles(region, index));
}

export function regionMovableIndices(region: SpectreRegion): number[] {
    if (region.kind === 'PA') return [1];
    // Keep the PA boundary fixed and move only the two placed N dividers.
    if (region.kind === 'PB') return [2, 3];
    // Likewise, keep the three M worms of the TA boundary fixed in TB.
    if (region.kind === 'TB') return [3, 4, 5];
    return region.worms.map((_, index) => index);
}

/** Apply independent manual offsets around each worm's diagnostic pivot. */
export function adjustRegionWorms(
    region: SpectreRegion,
    adjustments: Readonly<Record<number, WormAdjustment>>,
): SpectreRegion {
    return {
        ...region,
        worms: region.worms.map((placed, index) => {
            const adjustment = adjustments[index];
            if (!adjustment) return placed;
            const pivot = regionWormPivot(region, index);
            const rotation = createTransform({ x: 0, y: 0 }, adjustment.rotationRad);
            const rotatedPivot = applyTransform(rotation, pivot);
            const rotateAroundPivot = createTransform(
                subVec2(pivot, rotatedPivot),
                adjustment.rotationRad,
            );
            const transform = composeTransforms(
                createTransform(adjustment.translation, 0),
                rotateAroundPivot,
            );
            return {
                ...placed,
                transform: composeTransforms(transform, placed.transform),
            };
        }),
    };
}

const REGION_WORM_COLORS = [
    '#d85b4b',
    '#3b78a8',
    '#3f8f5f',
    '#7c3aed',
    '#b66a2c',
    '#168a9c',
] as const;

/** Fill groups one semantic level below each placed S worm. */
export function regionColorGroups(region: SpectreRegion) {
    return region.worms.flatMap((placed) => {
        const components = placed.worm.components?.length ? placed.worm.components : [placed.worm];
        return components.map((component) => ({
            fill: WORM_COLOR_MAP[component.kind],
            tiles: placedTiles(region, placed, component.tiles),
        }));
    });
}

/** Whole-S groups retained for distinguishing the fixed and movable outlines. */
export function regionWormGroups(region: SpectreRegion) {
    return region.worms.map((placed, index) => ({
        fill: REGION_WORM_COLORS[index] ?? '#7c3aed',
        tiles: placedWormTiles(region, placed),
    }));
}

export type RegionEndMarker = {
    label: string;
    end: 'front' | 'rear';
    color: string;
    position: Vec2;
};

function tileCenter(tile: SmithTile): Vec2 {
    const points = tile.shape.vertices.map((vertex) =>
        applyTransform(tile.transform, vertex.position),
    );
    const total = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), {
        x: 0,
        y: 0,
    });
    return { x: total.x / points.length, y: total.y / points.length };
}

export function regionEndMarkers(region: SpectreRegion): RegionEndMarker[] {
    return region.worms.flatMap((placed, index) => {
        const tiles = placedWormTiles(region, placed);
        return [
            {
                label: `F${index + 1}`,
                end: 'front' as const,
                color: REGION_WORM_COLORS[index] ?? '#7c3aed',
                position: tileCenter(tiles[placed.worm.front.tileIndex]),
            },
            {
                label: `R${index + 1}`,
                end: 'rear' as const,
                color: REGION_WORM_COLORS[index] ?? '#7c3aed',
                position: tileCenter(tiles[placed.worm.rear.tileIndex]),
            },
        ];
    });
}

const PLACEMENT_EPSILON = 1e-6;

function distance(a: Vec2, b: Vec2): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Find the orientation-preserving rigid transform mapping sourceA/B to targetA/B. */
function rigidPlacementTransform(
    sourceA: Vec2,
    sourceB: Vec2,
    targetA: Vec2,
    targetB: Vec2,
): Transform {
    const sourceLength = distance(sourceA, sourceB);
    const targetLength = distance(targetA, targetB);
    if (sourceLength < PLACEMENT_EPSILON || targetLength < PLACEMENT_EPSILON) {
        throw new Error('Cannot place a worm from coincident anchor points');
    }
    if (Math.abs(sourceLength - targetLength) > PLACEMENT_EPSILON) {
        throw new Error('Worm placement anchors have different lengths');
    }

    const rotationRad =
        Math.atan2(targetB.y - targetA.y, targetB.x - targetA.x) -
        Math.atan2(sourceB.y - sourceA.y, sourceB.x - sourceA.x);
    const rotation = createTransform({ x: 0, y: 0 }, rotationRad);
    const rotatedSourceA = applyTransform(rotation, sourceA);
    return createTransform(subVec2(targetA, rotatedSourceA), rotationRad);
}

/** Place N.rear vertices 3/4/5 on the E Turtle vertices 1/0/13. */
function paNDividerTransform(paBoundary: PlacedWorm, n: NamedWorm): Transform {
    const e = findOnlyDirectComponent(paBoundary.worm, 'E');
    const eTurtle = e.tiles[e.rear.tileIndex];
    const targetVertices = smithTileWorldVertices(eTurtle).map((point) =>
        applyTransform(paBoundary.transform, point),
    );
    const nRear = n.tiles[n.rear.tileIndex];
    const sourceVertices = smithTileWorldVertices(nRear);
    const transform = rigidPlacementTransform(
        sourceVertices[3],
        sourceVertices[4],
        targetVertices[1],
        targetVertices[0],
    );

    const correspondences = [
        [3, 1],
        [4, 0],
        [5, 13],
    ] as const;
    for (const [sourceIndex, targetIndex] of correspondences) {
        const placedSource = applyTransform(transform, sourceVertices[sourceIndex]);
        if (distance(placedSource, targetVertices[targetIndex]) > PLACEMENT_EPSILON) {
            throw new Error(
                `N.rear vertex ${sourceIndex} does not match E Turtle vertex ${targetIndex}`,
            );
        }
    }
    return transform;
}

/** Place S.front vertices 0/13/12 on the next-level M's front S rear vertices 0/1/2. */
function taSDividerTransform(taBoundary: PlacedWorm, s: NamedWorm): Transform {
    assertKind(taBoundary.worm, 'M');
    const frontSideS = taBoundary.worm.components?.find((component) => component.kind === 'S');
    if (!frontSideS) throw new Error('Expected a front-side S component in M');

    const targetTile = frontSideS.tiles[frontSideS.rear.tileIndex];
    const targetVertices = smithTileWorldVertices(targetTile).map((point) =>
        applyTransform(taBoundary.transform, point),
    );
    const sourceTile = s.tiles[s.front.tileIndex];
    const sourceVertices = smithTileWorldVertices(sourceTile);
    const transform = rigidPlacementTransform(
        sourceVertices[0],
        sourceVertices[13],
        targetVertices[0],
        targetVertices[1],
    );

    const correspondences = [
        [0, 0],
        [13, 1],
        [12, 2],
    ] as const;
    for (const [sourceIndex, targetIndex] of correspondences) {
        const placedSource = applyTransform(transform, sourceVertices[sourceIndex]);
        if (distance(placedSource, targetVertices[targetIndex]) > PLACEMENT_EPSILON) {
            throw new Error(
                `S.front vertex ${sourceIndex} does not match M front-S rear vertex ${targetIndex}`,
            );
        }
    }
    return transform;
}

/**
 * PA partition scene. Each same-level N divider is attached to the E Turtle of
 * the corresponding S boundary by an orientation-preserving rigid transform.
 */
export function createPB(s: NamedWorm, n: NamedWorm): SpectreRegion {
    assertKind(s, 'S');
    assertKind(n, 'N');
    assertLevel(s);
    assertLevel(n);
    assertSameLevel(s, n);

    const pa = createPA(s);

    return {
        kind: 'PB',
        level: s.level,
        worms: [
            ...pa.worms,
            {
                worm: n,
                transform: paNDividerTransform(pa.worms[0], n),
            },
            {
                worm: n,
                transform: paNDividerTransform(pa.worms[1], n),
            },
        ],
        transform: IDENTITY_TRANSFORM,
    };
}

/**
 * TA partition scene. Each previous-level S divider is attached to the
 * front-side S of the corresponding M boundary by a rigid transform.
 */
export function createTB(m: NamedWorm, previousS: NamedWorm): SpectreRegion {
    assertKind(m, 'M');
    assertKind(previousS, 'S');
    assertLevel(m, 2);
    assertLevel(previousS);
    if (previousS.level !== m.level - 1) {
        throw new Error(
            `Expected S at level ${m.level - 1} for TB${m.level}, got level ${previousS.level}`,
        );
    }

    const ta = createTA(m);

    return {
        kind: 'TB',
        level: m.level,
        worms: [
            ...ta.worms,
            {
                worm: previousS,
                transform: taSDividerTransform(ta.worms[0], previousS),
            },
            {
                worm: previousS,
                transform: taSDividerTransform(ta.worms[1], previousS),
            },
            {
                worm: previousS,
                transform: taSDividerTransform(ta.worms[2], previousS),
            },
        ],
        transform: IDENTITY_TRANSFORM,
    };
}

export type CoreSpectreRegionLevel = {
    level: number;
    PA: SpectreRegion;
    TA: SpectreRegion;
    TC: SpectreRegion;
};

/** Build the three core regions directly from one generated worm level. */
export function createCoreSpectreRegionLevel(worms: ArticulatedWormLevel): CoreSpectreRegionLevel {
    for (const worm of [worms.I, worms.S, worms.M, worms.N]) {
        if (worm.level !== worms.level) {
            throw new Error(
                `Worm ${worm.kind} level ${worm.level} does not match level set ${worms.level}`,
            );
        }
    }
    return {
        level: worms.level,
        PA: createPA(worms.S),
        TA: createTA(worms.M),
        TC: createTC(worms.N),
    };
}

export type ArticulatedRegionLevel = CoreSpectreRegionLevel & {
    PB: SpectreRegion;
    /** TB needs S_(k-1), so it is absent when no preceding worm level was supplied. */
    TB?: SpectreRegion;
};

/** Generate every supported region at each supplied articulated worm level. */
export function createArticulatedRegionLevels(
    wormLevels: readonly ArticulatedWormLevel[],
): readonly ArticulatedRegionLevel[] {
    return wormLevels.map((worms, index) => {
        const core = createCoreSpectreRegionLevel(worms);
        const previous = wormLevels[index - 1];
        const TB =
            previous?.level === worms.level - 1 ? createTB(worms.M, previous.S) : undefined;
        return {
            ...core,
            PB: createPB(worms.S, worms.N),
            ...(TB ? { TB } : {}),
        };
    });
}

function createRegionRegistry(wormLevels: readonly ArticulatedWormLevel[]) {
    const [level1, level2] = createArticulatedRegionLevels(wormLevels);
    if (level1?.level !== 1 || level2?.level !== 2 || !level2.TB) {
        throw new Error('Spectre region registry requires contiguous worm levels 1 and 2');
    }
    return {
        PA1: level1.PA,
        PA2: level2.PA,
        TA1: level1.TA,
        TA2: level2.TA,
        TC1: level1.TC,
        TC2: level2.TC,
        PB2: level2.PB,
        TB2: level2.TB,
    } satisfies Record<string, SpectreRegion>;
}

export const SPECTRE_REGIONS = createRegionRegistry(ARTICULATED_WORM_LEVELS);

export const MIRRORED_SPECTRE_REGIONS = createRegionRegistry(
    MIRRORED_ARTICULATED_WORM_LEVELS,
) satisfies Record<keyof typeof SPECTRE_REGIONS, SpectreRegion>;

export type SpectreRegionKey = keyof typeof SPECTRE_REGIONS;
export const SPECTRE_REGION_KEYS = Object.keys(SPECTRE_REGIONS) as SpectreRegionKey[];
