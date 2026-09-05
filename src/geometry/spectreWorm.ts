import { getPortFromVertex } from './smithPatch';
import { createSmithTile, type SmithTile } from './smithTile';
import {
    applyTransform,
    composeTransforms,
    createReflectionTransform,
    createTransform,
    IDENTITY_TRANSFORM,
    type Transform,
} from './Transform';
import { subVec2 } from './Vec2';

export type WormFamily = 'articulated' | 'wriggly';
export type WormAtomKind = 'E' | 'O' | 'I0';
export type WormKind = 'I' | 'S' | 'N' | 'M';

export type WormEnd = {
    atomKind: WormAtomKind;
    tileIndex: number;
};

export type Worm = {
    family: WormFamily;
    kind?: WormAtomKind | WormKind;
    /** Recursive generation level; absent only on unnamed concatenation diagnostics. */
    level?: number;

    tiles: readonly SmithTile[];

    front: WormEnd;
    rear: WormEnd;

    /** Placed, named worms directly below this worm's semantic level. */
    components?: readonly NamedWorm[];
    transform: Transform;
};

export type NamedWorm = Worm & { kind: WormAtomKind | WormKind; level: number };

export type ArticulatedWormLevel = {
    level: number;
    I: NamedWorm;
    S: NamedWorm;
    M: NamedWorm;
    N: NamedWorm;
};

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
        level: 0,
        tiles,
        transform: IDENTITY_TRANSFORM,
        front: { atomKind: kind, tileIndex: frontTileIndex },
        rear: { atomKind: kind, tileIndex: rearTileIndex },
    };
}
function createBaseAtoms(partTransform: Transform): { E: NamedWorm; O: NamedWorm; I0: NamedWorm } {
    const hat = createSmithTile(1, Math.sqrt(3), partTransform);
    const turtle = createSmithTile(Math.sqrt(3), 1, partTransform);
    const ETiles = attachTileGroup([hat], { tileIndex: 0, vertexIndex: 4 }, [turtle], {
        tileIndex: 0,
        vertexIndex: 12,
    });
    const OTiles = attachTileGroup([turtle], { tileIndex: 0, vertexIndex: 4 }, [hat], {
        tileIndex: 0,
        vertexIndex: 12,
    });

    return {
        E: createAtom('E', ETiles, 0, 1),
        O: createAtom('O', OTiles, 0, 1),
        I0: createAtom('I0', [turtle], 0, 0),
    };
}

const EMPTY_WORM: EmptyWorm = {
    type: 'empty',
    kind: 'S0',
};

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

function composeWorm(kind: WormKind, level: number, parts: readonly WormValue[]): NamedWorm {
    const worms = parts.filter((part): part is NamedWorm => !('type' in part));
    return { ...concatWorms(worms), kind, level };
}

// OSISISE
function composeI(
    level: number,
    E: NamedWorm,
    O: NamedWorm,
    S: WormValue,
    I: WormValue,
): NamedWorm {
    return composeWorm('I', level, [O, S, I, S, I, S, E]);
}

function composeS(
    level: number,
    E: NamedWorm,
    O: NamedWorm,
    S: WormValue,
    I: WormValue,
): NamedWorm {
    const side = [S, I, S, I, S] as const;
    return composeWorm('S', level, [...side, E, S, I, S, O, ...side]);
}

function composeM(level: number, S: WormValue, I: WormValue, M: WormValue): NamedWorm {
    return composeWorm('M', level, [S, I, S, I, M]);
}

function composeN(level: number, S: WormValue, I: WormValue): NamedWorm {
    return composeWorm('N', level, [S, I, S]);
}

type ArticulatedWormState = {
    I: NamedWorm;
    S: WormValue;
    M: WormValue;
};

type ArticulatedWormSystem = {
    E: NamedWorm;
    O: NamedWorm;
    I0: NamedWorm;
    levels: readonly ArticulatedWormLevel[];
};

function nextArticulatedWormLevel(
    level: number,
    atoms: Pick<ArticulatedWormSystem, 'E' | 'O'>,
    previous: ArticulatedWormState,
): ArticulatedWormLevel {
    return {
        level,
        I: composeI(level, atoms.E, atoms.O, previous.S, previous.I),
        S: composeS(level, atoms.E, atoms.O, previous.S, previous.I),
        M: composeM(level, previous.S, previous.I, previous.M),
        N: composeN(level, previous.S, previous.I),
    };
}

function createArticulatedWormSystem(
    maxLevel: number,
    partTransform: Transform,
): ArticulatedWormSystem {
    if (!Number.isInteger(maxLevel) || maxLevel < 0) {
        throw new Error(`maxLevel must be a non-negative integer, got ${maxLevel}`);
    }
    const { E, O, I0 } = createBaseAtoms(partTransform);
    const levels: ArticulatedWormLevel[] = [];
    let previous: ArticulatedWormState = {
        I: I0,
        S: EMPTY_WORM,
        M: EMPTY_WORM,
    };

    for (let level = 1; level <= maxLevel; level++) {
        const next = nextArticulatedWormLevel(level, { E, O }, previous);
        levels.push(next);
        previous = next;
    }

    return { E, O, I0, levels };
}

/** Generate every articulated I/S/M/N worm from level 1 through maxLevel. */
export function createArticulatedWormLevels(
    maxLevel: number,
    partTransform: Transform = IDENTITY_TRANSFORM,
): readonly ArticulatedWormLevel[] {
    return createArticulatedWormSystem(maxLevel, partTransform).levels;
}

function createArticulatedWormRegistry(system: ArticulatedWormSystem) {
    const { E, O, I0 } = system;
    const [level1, level2] = system.levels;
    if (!level1 || !level2) {
        throw new Error('Articulated worm registry requires levels 1 and 2');
    }

    return {
        E,
        O,
        I0,
        'E:I0': concatWorms([E, I0]),
        'O:I0': concatWorms([O, I0]),
        'I0:E': concatWorms([I0, E]),
        'I0:O': concatWorms([I0, O]),
        'I0:I0': concatWorms([I0, I0]),
        I1: level1.I,
        S1: level1.S,
        I2: level2.I,
        S2: level2.S,
        M1: level1.M,
        N1: level1.N,
        M2: level2.M,
        N2: level2.N,
    } satisfies Record<string, Worm>;
}

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

const ARTICULATED_WORM_SYSTEM = createArticulatedWormSystem(2, IDENTITY_TRANSFORM);
const MIRRORED_ARTICULATED_WORM_SYSTEM = createArticulatedWormSystem(
    2,
    createReflectionTransform(),
);

export const ARTICULATED_WORM_LEVELS = ARTICULATED_WORM_SYSTEM.levels;
export const MIRRORED_ARTICULATED_WORM_LEVELS = MIRRORED_ARTICULATED_WORM_SYSTEM.levels;
export const ARTICULATED_WORMS = createArticulatedWormRegistry(ARTICULATED_WORM_SYSTEM);
export const MIRRORED_ARTICULATED_WORMS = createArticulatedWormRegistry(
    MIRRORED_ARTICULATED_WORM_SYSTEM,
);

export type ArticulatedWormKey = keyof typeof ARTICULATED_WORMS;
export const ARTICULATED_WORM_KEYS = Object.keys(ARTICULATED_WORMS) as ArticulatedWormKey[];
