/** Künzel Part III: Tile(a,b) Articulated. */
import {
    applyPatch as applyTilePatch,
    attachPatch as attachTilePatch,
    closePatch as close,
    IDENTITY_PATCH as identity,
    type NamedPatch,
    namePatch as name,
    PATCH_ORIGIN as origin,
    type Patch,
    type PatchComponent,
    type PlacedTile,
    patchParts as parts,
    placePatch,
    vertexPort,
} from './patchComposition';
import { createSmithTile } from './smithTile';
import { IDENTITY_TRANSFORM } from './Transform';

export type { DirectedPort } from './patchComposition';
export {
    applyPatch as applyTilePatch,
    attachPatch as attachTilePatch,
    patchPort as tilePatchPort,
} from './patchComposition';
export type TilePatchKind = 'B' | 'S' | 'C';
export const TILE_PATCH_KINDS: readonly TilePatchKind[] = ['B', 'S', 'C'];
export const MAX_TILE_PATCH_LEVEL = 4;
export type TilePatch = Patch<TilePatchKind>;
export type NamedTilePatch = NamedPatch<TilePatchKind>;
type PatchLevel = Record<TilePatchKind, NamedTilePatch>;

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
    const components: readonly PatchComponent<TilePatchKind>[] = patch.components.length
        ? patch.components
        : [patch];
    return components
        .filter((part) => part.tiles.length > 0)
        .map((part) => ({ fill: TILE_PATCH_COLORS[part.kind], tiles: part.tiles }));
}
