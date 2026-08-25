import { getPortFromVertex } from './smithPatch';
import { createSmithTile, type SmithTile } from './smithTile';
import {
    applyTransform,
    composeTransforms,
    createTransform,
    IDENTITY_TRANSFORM,
    type Transform,
} from './Transform';
import { subVec2 } from './Vec2';

export type WormFamily = 'articulated' | 'wriggly';
export type WormAtomKind = 'E' | 'O' | 'I0';

const OddSpectreHat = createSmithTile(1, Math.sqrt(3), IDENTITY_TRANSFORM);

const EvenSpectreTurtle = createSmithTile(Math.sqrt(3), 1, IDENTITY_TRANSFORM);

export type WormEnd = {
    atomKind: WormAtomKind;
    tileIndex: number;
};

export type Worm = {
    family: WormFamily;
    kind?: WormAtomKind;

    tiles: readonly SmithTile[];

    front: WormEnd;
    rear: WormEnd;

    components?: readonly Worm[];
    transform: Transform;
};

type EmptyWorm = {
    type: 'empty';
    kind: 'S0';
};

type WormValue = Worm | EmptyWorm;

const S0: EmptyWorm = {
    type: 'empty',
    kind: 'S0',
};

type JoinRule = {
    parentVertexIndex: number;
    childVertexIndex: number;
};

const JOIN_RULES: Record<string, JoinRule> = {
    'E:I0': { parentVertexIndex: 4, childVertexIndex: 10 },
    'O:I0': { parentVertexIndex: 6, childVertexIndex: 10 },
    'I0:E': { parentVertexIndex: 6, childVertexIndex: 0 },
    'I0:O': { parentVertexIndex: 4, childVertexIndex: 10 },
    'I0:I0': { parentVertexIndex: 4, childVertexIndex: 10 },
};

type TileAnchor = {
    tileIndex: number;
    vertexIndex: number;
};

function attachTileGroup(
    parentTiles: readonly SmithTile[],
    parentAnchor: TileAnchor,
    childTiles: readonly SmithTile[],
    childAnchor: TileAnchor,
): SmithTile[] {
    const t = tileGroupAttachmentTransform(parentTiles, parentAnchor, childTiles, childAnchor);

    return [
        ...parentTiles,
        ...childTiles.map((tile) => ({
            ...tile,
            transform: composeTransforms(t, tile.transform),
        })),
    ];
}

function tileGroupAttachmentTransform(
    parentTiles: readonly SmithTile[],
    parentAnchor: TileAnchor,
    childTiles: readonly SmithTile[],
    childAnchor: TileAnchor,
): Transform {
    const parent = parentTiles[parentAnchor.tileIndex];
    const child = childTiles[childAnchor.tileIndex];

    const parentPort = getPortFromVertex(parent, parentAnchor.vertexIndex);
    const childPort = getPortFromVertex(child, childAnchor.vertexIndex);

    const childRotationRad = parentPort.inwardAngleRad + Math.PI - childPort.inwardAngleRad;

    const rotation = createTransform({ x: 0, y: 0 }, childRotationRad);
    const rotatedChildPlug = applyTransform(rotation, childPort.position);
    const translation = subVec2(parentPort.position, rotatedChildPlug);

    return createTransform(translation, childRotationRad);
}

function transformWorm(worm: Worm, transform: Transform): Worm {
    return {
        ...worm,
        tiles: worm.tiles.map((tile) => ({
            ...tile,
            transform: composeTransforms(transform, tile.transform),
        })),
        components: worm.components?.map((component) => transformWorm(component, transform)),
        transform: composeTransforms(transform, worm.transform),
    };
}

function concat(a: Worm, b: Worm): Worm {
    const rule = JOIN_RULES[`${a.rear.atomKind}:${b.front.atomKind}`];

    if (!rule) {
        throw new Error(`Unsupported worm concatenation: ${a.rear.atomKind} + ${b.front.atomKind}`);
    }

    const childTransform = tileGroupAttachmentTransform(
        a.tiles,
        {
            tileIndex: a.rear.tileIndex,
            vertexIndex: rule.parentVertexIndex,
        },
        b.tiles,
        {
            tileIndex: b.front.tileIndex,
            vertexIndex: rule.childVertexIndex,
        },
    );
    const placedChild = transformWorm(b, childTransform);
    const tiles = [...a.tiles, ...placedChild.tiles];

    return {
        family: a.family,
        kind: undefined,
        tiles,
        transform: a.transform,
        front: a.front,
        rear: {
            atomKind: b.rear.atomKind,
            tileIndex: a.tiles.length + b.rear.tileIndex,
        },
        components: [a, placedChild],
    };
}

function createAtom(
    kind: WormAtomKind,
    tiles: readonly SmithTile[],
    frontTileIndex: number,
    rearTileIndex: number,
): Worm {
    return {
        family: 'articulated',
        kind,
        tiles,
        transform: IDENTITY_TRANSFORM,
        front: { atomKind: kind, tileIndex: frontTileIndex },
        rear: { atomKind: kind, tileIndex: rearTileIndex },
    };
}
const ETiles = attachTileGroup(
    [OddSpectreHat],
    { tileIndex: 0, vertexIndex: 4 },
    [EvenSpectreTurtle],
    { tileIndex: 0, vertexIndex: 12 },
);
const OTiles = attachTileGroup(
    [EvenSpectreTurtle],
    { tileIndex: 0, vertexIndex: 4 },
    [OddSpectreHat],
    { tileIndex: 0, vertexIndex: 12 },
);

const E: Worm = createAtom('E', ETiles, 0, 1);
const O: Worm = createAtom('O', OTiles, 0, 1);

const I0: Worm = createAtom('I0', [EvenSpectreTurtle], 0, 0);

function concatWorms(parts: readonly WormValue[]): WormValue {
    const worms = parts.filter((x): x is Worm => !('type' in x && x.type === 'empty'));

    if (worms.length === 0) {
        return S0;
    }

    return worms.slice(1).reduce((a, b) => concat(a, b), worms[0]);
}

function nonEmptyWorm(value: WormValue): Worm {
    if ('type' in value) throw new Error('Expected a non-empty worm');
    return value;
}

// OSISISE
function composeI(S: WormValue, I: WormValue): Worm {
    return nonEmptyWorm(concatWorms([O, S, I, S, I, S, E]));
}

function composeS(S: WormValue, I: WormValue): Worm {
    const side = concatWorms([S, I, S, I, S]);
    return nonEmptyWorm(concatWorms([side, E, S, I, S, O, side]));
}

const I1 = composeI(S0, I0);
const S1 = composeS(S0, I0);
const I2 = composeI(S1, I1);
const S2 = composeS(S1, I1);

export const WORM_COLOR_MAP: Record<WormAtomKind, string> = {
    E: 'orange',
    O: 'cyan',
    I0: 'purple',
};

export type WormColorGroup = { fill: string; tiles: readonly SmithTile[] };

/** Flatten a composed worm into its placed atom components for rendering. */
export function wormColorGroups(worm: Worm): WormColorGroup[] {
    if (worm.components && worm.components.length > 0) {
        return worm.components.flatMap(wormColorGroups);
    }
    if (!worm.kind) return [];
    return [{ fill: WORM_COLOR_MAP[worm.kind], tiles: worm.tiles }];
}

export const ARTICULATED_WORMS = {
    E,
    O,
    I0,
    'E:I0': concat(E, I0),
    'O:I0': concat(O, I0),
    'I0:E': concat(I0, E),
    'I0:O': concat(I0, O),
    'I0:I0': concat(I0, I0),
    I1,
    S1,
    I2,
    S2,
} satisfies Record<string, Worm>;

export type ArticulatedWormKey = keyof typeof ARTICULATED_WORMS;
export const ARTICULATED_WORM_KEYS = Object.keys(ARTICULATED_WORMS) as ArticulatedWormKey[];
