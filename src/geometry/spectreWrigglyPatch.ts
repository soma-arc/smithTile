/** Künzel Part II, WrigglyTreesAsFunctions_v1.pdf (20 July 2024). */
import {
    applyPatch as apply,
    attachPatch,
    closePatch as close,
    createPatchTile,
    IDENTITY_PATCH as id,
    type NamedPatch,
    namePatch as name,
    PATCH_ORIGIN,
    type Patch,
    patchColorGroups,
    placePatch,
    vertexPort,
} from './patchComposition';

export const SPECTRE_WRIGGLY_KINDS = ['I', 'S', 'N', 'Aa', 'Ab', 'Ma', 'Mb'] as const;
export type SpectreWrigglyKind = (typeof SPECTRE_WRIGGLY_KINDS)[number];
type P = Patch<SpectreWrigglyKind | 'T'>;
export type SpectreWrigglyPatch = NamedPatch<SpectreWrigglyKind | 'T'>;
type Level = Record<SpectreWrigglyKind, SpectreWrigglyPatch>;
export const MAX_SPECTRE_WRIGGLY_LEVEL = 2;

function single(sockets: readonly number[]): P {
    const tile = createPatchTile(1, 1);
    return {
        tiles: [tile],
        plug: vertexPort(tile, 6),
        sockets: sockets.map((i) => vertexPort(tile, i)),
        components: [],
        level: 0,
    };
}
const T = name(placePatch(single([2, 12]), PATCH_ORIGIN, 4), 'T', 0);

function composeI(S: P, N: P, Aa: P, Ab: P, Ma: P): P {
    const n = close(N),
        ma = close(Ma);
    return apply(Ab, [
        apply(T, [ma, apply(Aa, [n, apply(S, [apply(Ab, [apply(T, [Aa, ma]), n])])])]),
        id,
    ]);
}
function composeS(N: P, Ab: P, Ma: P, Mb: P): P {
    const ma = close(Ma);
    return apply(Mb, [apply(T, [apply(Ma, [apply(Ab, [apply(T, [ma, Ma]), close(N)])]), ma])]);
}
const composeN = (S: P, I: P) => apply(S, [apply(I, [close(S), S, close(S)])]);
const composeAa = (Ma: P, I: P, S: P) => apply(Ma, [apply(I, [id, id, close(S)])]);
const composeAb = (Mb: P, I: P, S: P) => apply(I, [close(S), Mb, id]);

function initialLevel(): Level {
    const stem = single([10]);
    const chain = attachPatch(attachPatch(stem, 0, stem), 0, stem);
    const I = name(
        placePatch(
            {
                ...chain,
                sockets: [
                    vertexPort(chain.tiles[1], 0),
                    vertexPort(chain.tiles[2], 2),
                    vertexPort(chain.tiles[1], 8),
                ],
            },
            PATCH_ORIGIN,
            4,
        ),
        'I',
        0,
    );
    const S = name(placePatch(attachPatch(single([2]), 0, single([12])), PATCH_ORIGIN, 4), 'S', 0);
    const Ma = name<SpectreWrigglyKind | 'T'>(id, 'Ma', 0),
        Mb = name<SpectreWrigglyKind | 'T'>(id, 'Mb', 0);
    return {
        Ma,
        Mb,
        I,
        S,
        N: name(composeN(S, I), 'N', 0),
        Aa: name(composeAa(Ma, I, S), 'Aa', 0),
        Ab: name(composeAb(Mb, I, S), 'Ab', 0),
    };
}
const patches = new Map<string, SpectreWrigglyPatch>();
const mirrors = new Map<string, SpectreWrigglyPatch>();
function buildPatch(kind: SpectreWrigglyKind, level: number): SpectreWrigglyPatch {
    const key = `${kind}:${level}`;
    const cached = patches.get(key);
    if (cached) return cached;
    if (level === 0) {
        const initial = initialLevel();
        for (const k of SPECTRE_WRIGGLY_KINDS) patches.set(`${k}:0`, initial[k]);
        return initial[kind];
    }
    const prev = (k: SpectreWrigglyKind) => buildPatch(k, level - 1);
    const current = (k: SpectreWrigglyKind) => buildPatch(k, level);
    let result: P;
    // Ma < Mb < I < S < N < Aa < Ab. Build only the dependencies of the selection.
    switch (kind) {
        case 'Ma':
            result = apply(prev('Aa'), [close(prev('N')), prev('N')]);
            break;
        case 'Mb':
            result = apply(prev('N'), [apply(prev('Ab'), [id, close(prev('N'))])]);
            break;
        case 'I':
            result = composeI(prev('S'), prev('N'), prev('Aa'), prev('Ab'), current('Ma'));
            break;
        case 'S':
            result = composeS(prev('N'), prev('Ab'), current('Ma'), current('Mb'));
            break;
        case 'N':
            result = composeN(current('S'), current('I'));
            break;
        case 'Aa':
            result = composeAa(current('Ma'), current('I'), current('S'));
            break;
        case 'Ab':
            result = composeAb(current('Mb'), current('I'), current('S'));
            break;
    }
    const named = name(result, kind, level);
    patches.set(key, named);
    return named;
}
export function getSpectreWrigglyPatch(
    kind: SpectreWrigglyKind,
    level: number,
    mirrored = false,
): SpectreWrigglyPatch {
    if (!Number.isInteger(level) || level < 0 || level > MAX_SPECTRE_WRIGGLY_LEVEL)
        throw new RangeError('Invalid Spectre Wriggly patch level');
    const patch = buildPatch(kind, level);
    if (!mirrored) return patch;
    const key = `${kind}:${level}`;
    let result = mirrors.get(key);
    if (!result) {
        result = name(placePatch(patch, PATCH_ORIGIN, 0, true), kind, level);
        mirrors.set(key, result);
    }
    return result;
}
export const SPECTRE_WRIGGLY_COLORS = {
    I: '#f39b32',
    S: '#e6c34d',
    N: '#8dcee2',
    Aa: '#e8a2be',
    Ab: '#ce7b9b',
    Ma: '#b4cc59',
    Mb: '#83ad4f',
    T: '#9b59b6',
} as const;
export const spectreWrigglyColorGroups = (patch: SpectreWrigglyPatch) =>
    patchColorGroups(patch, SPECTRE_WRIGGLY_COLORS);
