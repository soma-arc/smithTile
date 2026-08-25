import { createSmithTile, SmithTile, smithTileBoundary } from "./smithTile";
import { applyTransform, composeTransforms, createTransform, IDENTITY_TRANSFORM, Transform } from "./Transform";
import { getPortFromVertex, Port, SmithPatch } from "./smithPatch";
import { subVec2 } from "./Vec2";

type WormFamily = 'articulated' | 'wriggly';
type WormKind = 'S' | 'I' | 'M' | 'N';
type WormAtomKind = 'E' | 'O' | 'I0';

const OddSpectreHat = createSmithTile(1, Math.sqrt(3), IDENTITY_TRANSFORM)

const EvenSpectreTurtle = createSmithTile(Math.sqrt(3), 1, IDENTITY_TRANSFORM);

type WormEnd = {
    atomKind: WormAtomKind;
    tileIndex: number;
};

type Worm = {
    family: WormFamily;
    kind?: WormKind | WormAtomKind;

    tiles: readonly SmithTile[];

    front: WormEnd;
    rear: WormEnd;

    components?: readonly Worm[];
    transform: Transform;
};

type JoinRule = {
    parentVertexIndex: number;
    childVertexIndex: number;
};

const JOIN_RULES: Record<string, JoinRule> = {
    'E:I0':  { parentVertexIndex: 4, childVertexIndex: 10 },
    'O:I0':  { parentVertexIndex: 6, childVertexIndex: 10 },
    'I0:E':  { parentVertexIndex: 6, childVertexIndex: 0 },
    'I0:O':  { parentVertexIndex: 4, childVertexIndex: 10 },
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
    const parent = parentTiles[parentAnchor.tileIndex];
    const child = childTiles[childAnchor.tileIndex];

    const parentPort = getPortFromVertex(parent, parentAnchor.vertexIndex);
    const childPort = getPortFromVertex(child, childAnchor.vertexIndex);

    const childRotationRad =
        parentPort.inwardAngleRad + Math.PI - childPort.inwardAngleRad;

    const rotation = createTransform({ x: 0, y: 0 }, childRotationRad);
    const rotatedChildPlug = applyTransform(rotation, childPort.position);
    const translation = subVec2(parentPort.position, rotatedChildPlug);

    const t = createTransform(translation, childRotationRad);

    return [
        ...parentTiles,
        ...childTiles.map(tile => ({
            ...tile,
            transform: composeTransforms(t, tile.transform),
        })),
    ];
}

function concat(a: Worm, b: Worm): Worm {
    const rule = JOIN_RULES[`${a.rear.atomKind}:${b.front.atomKind}`];

    if (!rule) {
        throw new Error(
            `Unsupported worm concatenation: ${a.rear.atomKind} + ${b.front.atomKind}`
        );
    }

    const tiles = attachTileGroup(
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
        components: [a, b],
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

const I0: Worm = createAtom('O', [EvenSpectreTurtle], 0, 0);


export const ARTICULATED_WORMS = {
    E, O, I0,
    'EIO': concat(E, I0),
    'O:I0': concat(O, I0),
    'I0:E': concat(I0, E),
    'I0:O': concat(I0, O),
    'I0:I0': concat(I0, I0)
} satisfies Record<string, Worm>;
