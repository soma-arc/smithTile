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
export type WormKind = 'I' | 'S' | 'N' | 'M';

const OddSpectreHat = createSmithTile(1, Math.sqrt(3), IDENTITY_TRANSFORM);

const EvenSpectreTurtle = createSmithTile(Math.sqrt(3), 1, IDENTITY_TRANSFORM);

export type WormEnd = {
    atomKind: WormAtomKind;
    tileIndex: number;
};

export type Worm = {
    family: WormFamily;
    kind?: WormAtomKind | WormKind;

    tiles: readonly SmithTile[];

    front: WormEnd;
    rear: WormEnd;

    /** Placed, named worms directly below this worm's semantic level. */
    components?: readonly NamedWorm[];
    transform: Transform;
};

export type NamedWorm = Worm & { kind: WormAtomKind | WormKind };

type EmptyWorm = {
    type: 'empty';
    kind: 'S0';
};

type WormValue = NamedWorm | EmptyWorm;

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

function transformWorm(worm: NamedWorm, transform: Transform): NamedWorm {
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

function createAtom(
    kind: WormAtomKind,
    tiles: readonly SmithTile[],
    frontTileIndex: number,
    rearTileIndex: number,
): NamedWorm {
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

const E = createAtom('E', ETiles, 0, 1);
const O = createAtom('O', OTiles, 0, 1);
const S0: EmptyWorm = {
    type: 'empty',
    kind: 'S0',
};

const I0 = createAtom('I0', [EvenSpectreTurtle], 0, 0);

/** Concatenate named worms while retaining them as the direct semantic children. */
export function concatWorms(worms: readonly NamedWorm[]): Worm {
    const first = worms[0];
    if (!first) throw new Error('concatWorms: expected at least one worm');

    const tiles: SmithTile[] = [...first.tiles];
    const components: NamedWorm[] = [first];
    let rear = first.rear;

    for (const child of worms.slice(1)) {
        const rule = JOIN_RULES[`${rear.atomKind}:${child.front.atomKind}`];
        if (!rule) {
            throw new Error(
                `Unsupported worm concatenation: ${rear.atomKind} + ${child.front.atomKind}`,
            );
        }

        const childTransform = tileGroupAttachmentTransform(
            tiles,
            { tileIndex: rear.tileIndex, vertexIndex: rule.parentVertexIndex },
            child.tiles,
            { tileIndex: child.front.tileIndex, vertexIndex: rule.childVertexIndex },
        );
        const placedChild = transformWorm(child, childTransform);
        const tileOffset = tiles.length;
        tiles.push(...placedChild.tiles);
        components.push(placedChild);
        rear = {
            atomKind: placedChild.rear.atomKind,
            tileIndex: tileOffset + placedChild.rear.tileIndex,
        };
    }

    return {
        family: first.family,
        tiles,
        front: first.front,
        rear,
        components,
        transform: first.transform,
    };
}

function composeWorm(kind: WormKind, parts: readonly WormValue[]): NamedWorm {
    const worms = parts.filter((part): part is NamedWorm => !('type' in part));
    return { ...concatWorms(worms), kind };
}

// OSISISE
function composeI(S: WormValue, I: WormValue): NamedWorm {
    return composeWorm('I', [O, S, I, S, I, S, E]);
}

function composeS(S: WormValue, I: WormValue): NamedWorm {
    const side = [S, I, S, I, S] as const;
    return composeWorm('S', [...side, E, S, I, S, O, ...side]);
}

function composeM(S: WormValue, I: WormValue, M: WormValue): NamedWorm {
    return composeWorm('M', [S, I, S, I, M]);
}

function composeN(S: WormValue, I: WormValue): NamedWorm {
    return composeWorm('N', [S, I, S]);
}

const I1 = composeI(S0, I0);
const S1 = composeS(S0, I0);
const I2 = composeI(S1, I1);
const S2 = composeS(S1, I1);

const M0: EmptyWorm = {
    type: 'empty',
    kind: 'S0',
};

const N0: EmptyWorm = {
    type: 'empty',
    kind: 'S0',
};

const M1 = composeM(S0, I0, M0);
const N1 = composeN(N0, I0);

const M2 = composeM(S1, I1, M1);
const N2 = composeN(S1, I1);

export const WORM_COLOR_MAP: Record<WormAtomKind | WormKind, string> = {
    E: 'orange',
    O: 'cyan',
    I0: 'purple',
    I: 'blue',
    S: 'red',
    N: 'pink',
    M: 'green',
};

export type WormColorGroup = { fill: string; tiles: readonly SmithTile[] };

/** Color the semantic components one named worm level below the selected root. */
export function wormColorGroups(worm: Worm): WormColorGroup[] {
    const components = worm.components?.length
        ? worm.components
        : worm.kind
          ? [worm as NamedWorm]
          : [];
    return components.map((component) => ({
        fill: WORM_COLOR_MAP[component.kind],
        tiles: component.tiles,
    }));
}

export const ARTICULATED_WORMS = {
    E,
    O,
    I0,
    'E:I0': concatWorms([E, I0]),
    'O:I0': concatWorms([O, I0]),
    'I0:E': concatWorms([I0, E]),
    'I0:O': concatWorms([I0, O]),
    'I0:I0': concatWorms([I0, I0]),
    I1,
    S1,
    I2,
    S2,
    M1,
    N1,
    M2,
    N2,
} satisfies Record<string, Worm>;

export type ArticulatedWormKey = keyof typeof ARTICULATED_WORMS;
export const ARTICULATED_WORM_KEYS = Object.keys(ARTICULATED_WORMS) as ArticulatedWormKey[];
