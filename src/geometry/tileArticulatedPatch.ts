/** Künzel, TurtleArticulate_1.pdf (30 July 2024), pp. 1–3. */
import type { Port } from './smithPatch';
import { createSmithTile, type SmithTile } from './smithTile';
import {
    applyTransform,
    composeTransforms,
    createReflectionTransform,
    createTransform,
    IDENTITY_TRANSFORM,
} from './Transform';
import type { Vec2 } from './Vec2';

export type TilePatchKind = 'B' | 'S' | 'C';
export const TILE_PATCH_KINDS: readonly TilePatchKind[] = ['B', 'S', 'C'];
/** The PDF illustrates levels 0–4; bound interactive work before allocating tiles. */
export const MAX_TILE_PATCH_LEVEL = 4;

export type DirectedPort = { position: Vec2; direction: number };
type PlacedTile = SmithTile & { rotationSteps: number; mirrored: boolean };
type PatchComponent = { kind: TilePatchKind; level: number; tiles: readonly PlacedTile[] };
export type TilePatch = {
    tiles: readonly PlacedTile[];
    plug: DirectedPort;
    /** Function argument order, corresponding to x,y,z,u,v in the PDF. */
    sockets: readonly DirectedPort[];
    components: readonly PatchComponent[];
    kind?: TilePatchKind;
    level: number;
};
export type NamedTilePatch = TilePatch & { kind: TilePatchKind };
type PatchLevel = Record<TilePatchKind, NamedTilePatch>;

const direction = (step: number) => ((step % 12) + 12) % 12;

/** A view adapter; the construction itself keeps headings in integer 30° units. */
export function tilePatchPort(port: DirectedPort): Port {
    return { position: port.position, inwardAngleRad: (port.direction * Math.PI) / 6 };
}

function vertexPort(tile: PlacedTile, index: number): DirectedPort {
    const vertex = tile.shape.vertices[index];
    if (vertex?.portCandidate == null || vertex.inwardDirection === null) {
        throw new RangeError(`Vertex ${index} is not a connection port`);
    }
    const localDirection =
        vertex.inwardDirection + Math.round((vertex.interiorAngle * 6) / Math.PI);
    return {
        position: applyTransform(tile.transform, vertex.position),
        direction: direction(
            tile.rotationSteps + (tile.mirrored ? 6 - localDirection : localDirection),
        ),
    };
}

function placePatch(
    patch: TilePatch,
    translation: Vec2,
    rotationSteps: number,
    mirrored = false,
): TilePatch {
    const rotation = createTransform(translation, (rotationSteps * Math.PI) / 6);
    const transform = mirrored
        ? composeTransforms(rotation, createReflectionTransform())
        : rotation;
    const placeTile = (tile: PlacedTile): PlacedTile => ({
        ...tile,
        transform: composeTransforms(transform, tile.transform),
        rotationSteps: direction(
            rotationSteps + (mirrored ? -tile.rotationSteps : tile.rotationSteps),
        ),
        mirrored: mirrored !== tile.mirrored,
    });
    const placePort = (port: DirectedPort): DirectedPort => ({
        position: applyTransform(transform, port.position),
        direction: direction(rotationSteps + (mirrored ? 6 - port.direction : port.direction)),
    });
    return {
        ...patch,
        tiles: patch.tiles.map(placeTile),
        plug: placePort(patch.plug),
        sockets: patch.sockets.map(placePort),
        components: patch.components.map((part) => ({ ...part, tiles: part.tiles.map(placeTile) })),
    };
}

function parts(patch: TilePatch): readonly PatchComponent[] {
    return patch.kind
        ? [{ kind: patch.kind, level: patch.level, tiles: patch.tiles }]
        : patch.components;
}

/** Plug the child into one socket, propagating its arguments at that position. */
export function attachTilePatch(
    parent: TilePatch,
    socketIndex: number,
    child: TilePatch,
): TilePatch {
    if (!Number.isInteger(socketIndex) || socketIndex < 0 || socketIndex >= parent.sockets.length) {
        throw new RangeError(`Invalid socket index ${socketIndex}`);
    }
    const socket = parent.sockets[socketIndex];
    const steps = direction(socket.direction + 6 - child.plug.direction);
    const rotatedPlug = applyTransform(
        createTransform({ x: 0, y: 0 }, (steps * Math.PI) / 6),
        child.plug.position,
    );
    const placed = placePatch(
        child,
        { x: socket.position.x - rotatedPlug.x, y: socket.position.y - rotatedPlug.y },
        steps,
    );
    return {
        tiles: [...parent.tiles, ...placed.tiles],
        plug: parent.plug,
        sockets: [
            ...parent.sockets.slice(0, socketIndex),
            ...placed.sockets,
            ...parent.sockets.slice(socketIndex + 1),
        ],
        components: [...parts(parent), ...parts(placed)],
        level: parent.level,
    };
}

export function applyTilePatch(fn: TilePatch, args: readonly TilePatch[]): TilePatch {
    if (args.length !== fn.sockets.length) {
        throw new RangeError(`Expected ${fn.sockets.length} arguments, got ${args.length}`);
    }
    let result = fn;
    // Descending indices preserve the argument order as child sockets expand.
    for (let i = args.length - 1; i >= 0; i--) result = attachTilePatch(result, i, args[i]);
    return result;
}

const origin = { x: 0, y: 0 };
const empty: TilePatch = {
    tiles: [],
    plug: { position: origin, direction: 0 },
    sockets: [],
    components: [],
    level: 0,
};
const identity: TilePatch = {
    ...empty,
    sockets: [{ position: origin, direction: 6 }],
};
const name = (patch: TilePatch, kind: TilePatchKind, level: number): NamedTilePatch => ({
    ...patch,
    kind,
    level,
});
const close = (patch: TilePatch) =>
    applyTilePatch(
        patch,
        patch.sockets.map(() => empty),
    );

function initialLevel(a: number, b: number): PatchLevel {
    const tile: PlacedTile = {
        ...createSmithTile(a, b, IDENTITY_TRANSFORM),
        rotationSteps: 0,
        mirrored: false,
    };
    const seed: TilePatch = {
        tiles: [tile],
        plug: vertexPort(tile, 4),
        sockets: [vertexPort(tile, 10)],
        components: [],
        level: 0,
    };
    // p.2: C0 is a three-tile column with a reflected middle tile. Replacing it
    // with three equally oriented tiles preserves counts but breaks the tiling.
    const reflected = placePatch(seed, origin, 0, true);
    const column = attachTilePatch(attachTilePatch(seed, 0, reflected), 0, seed);
    const C0: TilePatch = {
        ...column,
        sockets: [
            vertexPort(column.tiles[0], 0), // x
            vertexPort(column.tiles[1], 8), // y
            vertexPort(column.tiles[2], 10), // z
            vertexPort(column.tiles[2], 8), // u
            vertexPort(column.tiles[1], 0), // v
        ],
    };
    // This common rotation presents the initial Turtle column as in the PDF.
    return {
        B: name(placePatch(seed, origin, 5), 'B', 0),
        S: name(identity, 'S', 0),
        C: name(placePatch(C0, origin, 5), 'C', 0),
    };
}

function nextLevel(prev: PatchLevel, level: number): PatchLevel {
    const { B, S, C } = prev;
    const b = close(B);
    // Every B/S/C on the right-hand side refers to n-1 (PDF p.1 §2).
    const nextB = applyTilePatch(B, [applyTilePatch(C, [b, b, B, b, b])]);
    const nextC = applyTilePatch(C, [
        identity,
        identity,
        applyTilePatch(S, [applyTilePatch(C, [b, b, identity, identity, identity])]),
        b,
        b,
    ]);
    return {
        B: name(nextB, 'B', level),
        S: name({ ...B, components: parts(B) }, 'S', level),
        C: name(nextC, 'C', level),
    };
}

const levels = new Map<string, PatchLevel[]>();
const mirroredPatches = new Map<string, NamedTilePatch>();
const MAX_CACHED_PARAMETER_PAIRS = 8;

const parameterKey = (a: number, b: number) => `${a}:${b}`;

function cacheLevels(parameters: string, generated: PatchLevel[]): void {
    if (levels.size >= MAX_CACHED_PARAMETER_PAIRS) {
        const oldest = levels.keys().next().value;
        if (oldest !== undefined) {
            levels.delete(oldest);
            for (const key of mirroredPatches.keys()) {
                if (key.startsWith(`${oldest}:`)) mirroredPatches.delete(key);
            }
        }
    }
    levels.set(parameters, generated);
}

/** Generate only requested levels, sharing the cache across view changes. */
export function getTileArticulatedPatch(
    a: number,
    b: number,
    kind: TilePatchKind,
    level: number,
    mirrored = false,
): NamedTilePatch {
    if (!Number.isInteger(level) || level < 0 || level > MAX_TILE_PATCH_LEVEL) {
        throw new RangeError(`Patch level must be an integer from 0 to ${MAX_TILE_PATCH_LEVEL}`);
    }
    const parameters = parameterKey(a, b);
    let generated = levels.get(parameters);
    if (!generated) {
        generated = [initialLevel(a, b)];
        cacheLevels(parameters, generated);
    } else {
        // Refresh insertion order so continuous parameter editing does not evict a recently used pair.
        levels.delete(parameters);
        levels.set(parameters, generated);
    }
    while (generated.length <= level) {
        generated.push(nextLevel(generated[generated.length - 1], generated.length));
    }
    const patch = generated[level][kind];
    if (!mirrored) return patch;
    const key = `${parameters}:${kind}:${level}`;
    let result = mirroredPatches.get(key);
    if (!result) {
        result = name(placePatch(patch, origin, 0, true), kind, level);
        mirroredPatches.set(key, result);
    }
    return result;
}

export const TILE_PATCH_COLORS: Readonly<Record<TilePatchKind, string>> = {
    B: '#d6c991',
    S: '#c45dcc',
    C: '#8dcee2',
};

export function tilePatchColorGroups(patch: NamedTilePatch) {
    const components: readonly PatchComponent[] = patch.components.length
        ? patch.components
        : [patch];
    return components
        .filter((part) => part.tiles.length > 0)
        .map((part) => ({ fill: TILE_PATCH_COLORS[part.kind], tiles: part.tiles }));
}
