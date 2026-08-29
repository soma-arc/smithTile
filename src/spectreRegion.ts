/** Two-dimensional regions assembled from canonical Conway worms. */

import { getPortFromVertex, type Port, transformPort } from './smithPatch';
import { type SmithTile, smithTileWorldVertices } from './smithTile';
import {
    ARTICULATED_WORMS,
    MIRRORED_ARTICULATED_WORMS,
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

export type SpectreRegion = {
    kind: 'PA' | 'TA';
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

function paAttachmentTransform(parent: NamedWorm, child: NamedWorm): Transform {
    const parentSocket = paOTurtleSocket(parent);
    return tripleSocketTransform(
        coincidentSockets(parent, parentSocket.position),
        paFrontSocket(child),
    );
}

export function createPA(level: number, s: NamedWorm): SpectreRegion {
    const first: PlacedWorm = { worm: s, transform: IDENTITY_TRANSFORM };
    const secondTransform = paAttachmentTransform(first.worm, s);
    const second: PlacedWorm = { worm: s, transform: secondTransform };

    return {
        kind: 'PA',
        level,
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
    assertPortCandidate(rearTile, 12, 'socket');
    assertPortCandidate(frontTile, 12, 'socket');
    const rearSocket = getPortFromVertex(rearTile, 12);
    const frontSocket = getPortFromVertex(frontTile, 12);
    if (
        Math.hypot(
            rearSocket.position.x - frontSocket.position.x,
            rearSocket.position.y - frontSocket.position.y,
        ) < 1e-6
    ) {
        return [rearSocket, frontSocket];
    }

    // Current worm geometry does not yet make the requested 12/12 anchors
    // coincide. Keep TA2 drawable by using the two sockets that actually meet
    // at I.front(12); the vertex overlay exposes the upstream mismatch.
    const actual = coincidentSockets(m, frontSocket.position);
    if (actual.length !== 2) {
        throw new Error(`Expected two actual sockets at TA2 junction, got ${actual.length}`);
    }
    return [actual[0], actual[1]];
}

function createTA1(m: NamedWorm): SpectreRegion {
    assertKind(m, 'M');
    const anchor = wormFrontSocket(m);
    const secondTransform = socketPlacementTransform(
        anchor.position,
        anchor.inwardAngleRad + (Math.PI * 2) / 3,
        wormFrontSocket(m),
    );
    const thirdTransform = socketPlacementTransform(
        anchor.position,
        anchor.inwardAngleRad - (Math.PI * 2) / 3,
        wormFrontSocket(m),
    );
    return {
        kind: 'TA',
        level: 1,
        worms: [
            { worm: m, transform: IDENTITY_TRANSFORM },
            { worm: m, transform: secondTransform },
            { worm: m, transform: thirdTransform },
        ],
        transform: IDENTITY_TRANSFORM,
    };
}

function createTA2(m: NamedWorm): SpectreRegion {
    assertKind(m, 'M');
    const first: PlacedWorm = { worm: m, transform: IDENTITY_TRANSFORM };
    const secondTransform = tripleSocketTransform(taRearSideJunction(m), wormFrontSocket(m));
    const second: PlacedWorm = { worm: m, transform: secondTransform };
    const secondJunction = taRearSideJunction(m).map((port) =>
        transformPort(secondTransform, port),
    );
    const thirdTransform = tripleSocketTransform(secondJunction, wormFrontSocket(m));
    return {
        kind: 'TA',
        level: 2,
        worms: [first, second, { worm: m, transform: thirdTransform }],
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
    return region.kind === 'PA' ? [1] : region.worms.map((_, index) => index);
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

const REGION_WORM_COLORS = ['#d85b4b', '#3b78a8', '#3f8f5f'] as const;

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

export const SPECTRE_REGIONS = {
    PA1: createPA(1, ARTICULATED_WORMS.S1),
    PA2: createPA(2, ARTICULATED_WORMS.S2),
    TA1: createTA1(ARTICULATED_WORMS.M1),
    TA2: createTA2(ARTICULATED_WORMS.M2),
} satisfies Record<string, SpectreRegion>;

export const MIRRORED_SPECTRE_REGIONS = {
    PA1: createPA(1, MIRRORED_ARTICULATED_WORMS.S1),
    PA2: createPA(2, MIRRORED_ARTICULATED_WORMS.S2),
    TA1: createTA1(MIRRORED_ARTICULATED_WORMS.M1),
    TA2: createTA2(MIRRORED_ARTICULATED_WORMS.M2),
} satisfies Record<keyof typeof SPECTRE_REGIONS, SpectreRegion>;

export type SpectreRegionKey = keyof typeof SPECTRE_REGIONS;
export const SPECTRE_REGION_KEYS = Object.keys(SPECTRE_REGIONS) as SpectreRegionKey[];
