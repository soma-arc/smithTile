/** Künzel Part IV, TurtleWriggly_1.pdf, pp.1–3 (30 July 2024). */
import {
    applyPatch,
    attachPatch,
    closePatch,
    createPatchTile,
    EMPTY_PATCH,
    IDENTITY_PATCH,
    namePatch,
    PATCH_ORIGIN,
    placePatch,
    vertexPort,
} from './patchComposition';
import type { NamedTilePatch, TilePatch, TilePatchKind } from './tileArticulatedPatch';

export const MAX_TILE_WRIGGLY_LEVEL = 4;
type Level = Record<TilePatchKind, NamedTilePatch>;

function composeS(B: TilePatch): TilePatch {
    // S_n uses B_n three times, including at n=0.
    return applyPatch(B, [
        applyPatch(B, [applyPatch(B, [EMPTY_PATCH, IDENTITY_PATCH]), EMPTY_PATCH]),
        EMPTY_PATCH,
    ]);
}

function initialLevel(a: number, b: number): Level {
    const tile = createPatchTile(a, b);
    const seed: TilePatch = {
        tiles: [tile],
        plug: vertexPort(tile, 6),
        sockets: [vertexPort(tile, 2), vertexPort(tile, 12)],
        components: [],
        level: 0,
    };
    // C0 has an unreflected root and a reflected child connected at root(12).
    const pair = attachPatch(seed, 1, placePatch(seed, PATCH_ORIGIN, 0, true));
    const C: TilePatch = {
        ...pair,
        sockets: [vertexPort(pair.tiles[1], 12), vertexPort(pair.tiles[1], 2)],
    };
    const B = namePatch<TilePatchKind>(placePatch(seed, PATCH_ORIGIN, 5), 'B', 0);
    return {
        B,
        C: namePatch(placePatch(C, PATCH_ORIGIN, 5), 'C', 0),
        S: namePatch(composeS(B), 'S', 0),
    };
}

function nextLevel(prev: Level, level: number): Level {
    const { B, C, S } = prev;
    const nextB = namePatch(applyPatch(C, [S, S]), 'B', level);
    const nextC = namePatch(
        applyPatch(C, [closePatch(S), applyPatch(B, [B, EMPTY_PATCH])]),
        'C',
        level,
    );
    return { B: nextB, C: nextC, S: namePatch(composeS(nextB), 'S', level) };
}

const cache = new Map<string, Level[]>();
const mirrors = new Map<string, NamedTilePatch>();
export function getTileWrigglyPatch(
    a: number,
    b: number,
    kind: TilePatchKind,
    level: number,
    mirrored = false,
): NamedTilePatch {
    if (!Number.isInteger(level) || level < 0 || level > MAX_TILE_WRIGGLY_LEVEL)
        throw new RangeError('Invalid Wriggly patch level');
    const key = `${a}:${b}`;
    let levels = cache.get(key);
    if (!levels) {
        levels = [initialLevel(a, b)];
        if (cache.size >= 8) {
            const oldest = cache.keys().next().value;
            if (oldest !== undefined) {
                cache.delete(oldest);
                for (const k of mirrors.keys()) if (k.startsWith(`${oldest}:`)) mirrors.delete(k);
            }
        }
    } else cache.delete(key);
    cache.set(key, levels);
    while (levels.length <= level) levels.push(nextLevel(levels[levels.length - 1], levels.length));
    const patch = levels[level][kind];
    if (!mirrored) return patch;
    const mirrorKey = `${key}:${kind}:${level}`;
    let result = mirrors.get(mirrorKey);
    if (!result) {
        result = namePatch(placePatch(patch, PATCH_ORIGIN, 0, true), kind, level);
        mirrors.set(mirrorKey, result);
    }
    return result;
}
