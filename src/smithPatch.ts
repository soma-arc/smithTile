/**
 * SmithPatch — articulated patch composition and prebuilt patch definitions.
 */

import { applyTransform, composeTransforms, IDENTITY_TRANSFORM, type Transform } from './Transform';
import { createSmithTile, type SmithTile } from './smithTile';
import { subVec2, type Vec2 } from './Vec2';

/**
 * Map a `Port` through a transform: its position is transformed like any point,
 * and its inward heading is rotated by the transform's rotation. Scale and
 * translation leave an angle (a unit-less heading, in radians) unchanged.
 */
export function transformPort(t: Transform, port: Port): Port {
    return {
        position: applyTransform(t, port.position),
        inwardAngleRad: port.inwardAngleRad + t.rotation,
    };
}

export type Port = {
    // patch-local position
    position: Vec2;
    /**
     * Direction toward the interior of the patch
     * at this marked vertex.
     */
    inwardAngleRad: number;
};

export type PatchFunctionKey = 'T' | 'I' | 'S' | 'N' | 'Aa' | 'Ab' | 'Ma' | 'Mb' | 'id' | 'empty';

export type SmithPatch = {
    tiles: readonly SmithTile[];
    plug: Port;
    sockets: readonly Port[];
    transform: Transform;
    patchFunctionKey?: PatchFunctionKey;
    /**
     * この patch を構成した、配置済みの named patches。
     * 描画時の色分け用。
     */
    components?: readonly SmithPatch[];
};

function transformPatch(patch: SmithPatch, transform: Transform): SmithPatch {
    return {
        ...patch,

        tiles: patch.tiles.map((tile) => ({
            ...tile,
            transform: composeTransforms(transform, tile.transform),
        })),

        plug: transformPort(transform, patch.plug),

        sockets: patch.sockets.map((socket) => transformPort(transform, socket)),

        transform: composeTransforms(transform, patch.transform),
    };
}

export function attachPatch(
    parent: SmithPatch,
    socketIndex: number,
    child: SmithPatch,
): SmithPatch {
    const parentSocket = parent.sockets[socketIndex];
    const childPlug = child.plug;

    const childRotationRad = parentSocket.inwardAngleRad + Math.PI - childPlug.inwardAngleRad;
    const rotatedChildPlugPosition = {
        x:
            childPlug.position.x * Math.cos(childRotationRad) -
            childPlug.position.y * Math.sin(childRotationRad),
        y:
            childPlug.position.x * Math.sin(childRotationRad) +
            childPlug.position.y * Math.cos(childRotationRad),
    };
    const translation = subVec2(parentSocket.position, rotatedChildPlugPosition);
    const attachTransform = { position: translation, rotation: childRotationRad, scale: 1 };

    const transformedChildTiles = child.tiles.map((tile) => ({
        ...tile,
        transform: composeTransforms(attachTransform, tile.transform),
    }));

    const parentComponents =
        parent.patchFunctionKey !== undefined
            ? [
                  {
                      ...parent,
                      components: undefined,
                  },
              ]
            : (parent.components ?? []);

    const childComponents =
        child.patchFunctionKey !== undefined
            ? [
                  {
                      ...child,
                      tiles: transformedChildTiles,
                      components: undefined,
                  },
              ]
            : (child.components ?? []).map((component) =>
                  transformPatch(component, attachTransform),
              );

    return {
        tiles: [...parent.tiles, ...transformedChildTiles],
        plug: parent.plug,
        // substitute the child sockets for the parent socket at socketIndex
        sockets: [
            ...parent.sockets.slice(0, socketIndex),
            ...child.sockets.map((socket) => transformPort(attachTransform, socket)),
            ...parent.sockets.slice(socketIndex + 1),
        ],
        transform: parent.transform,
        // attach結果は composeMa 等によって名前が付くまでは無名
        patchFunctionKey: undefined,
        components: [...parentComponents, ...childComponents],
    };
}

/**
 *
 * @param fn parent patch
 * @param args length of args should be equal to fn.sockets.length
 * @returns
 */
function applyPatch(fn: SmithPatch, args: readonly SmithPatch[]): SmithPatch {
    if (args.length !== fn.sockets.length) {
        throw new Error(`applyPatch: expected ${fn.sockets.length} arguments, got ${args.length}`);
    }
    let result = fn;
    // apply in reverse order so that the socket indices remain valid as we go
    // 前からソケットを埋めていくと、ソケットのインデックスが変わってしまうので、後ろから埋める
    for (let i = args.length - 1; i >= 0; i--) {
        result = attachPatch(result, i, args[i]);
    }
    return result;
}

function getPortFromVertex(tile: SmithTile, vertexIndex: number): Port {
    const vertex = tile.shape.vertices[vertexIndex];
    if (vertex.portCandidate === null) {
        throw new Error(`Vertex ${vertexIndex} is not a port candidate`);
    }
    return {
        position: applyTransform(tile.transform, vertex.position),
        inwardAngleRad:
            vertex.inwardDirection !== null
                ? vertex.interiorAngle + (vertex.inwardDirection * Math.PI) / 6
                : 0,
    };
}

const ARTICULATED_PLUG_VERTEX_INDEX = 4;

const ORIGIN_PLUG: Port = {
    position: { x: 0, y: 0 },
    inwardAngleRad: 0,
};

const ORIGIN_SOCKET: Port = {
    position: { x: 0, y: 0 },
    inwardAngleRad: Math.PI,
};

const EMPTY_PATCH: SmithPatch = {
    tiles: [],
    plug: ORIGIN_PLUG,
    sockets: [],
    transform: IDENTITY_TRANSFORM,
    patchFunctionKey: 'empty',
};

const IDENTITY_PATCH: SmithPatch = {
    tiles: [],
    plug: ORIGIN_PLUG,
    sockets: [ORIGIN_SOCKET],
    transform: IDENTITY_TRANSFORM,
    patchFunctionKey: 'id',
};

export function createArticulatedSpectre(socketIndices: number[]): SmithPatch {
    const tile = createSmithTile(1, 1, { position: { x: 0, y: 0 }, rotation: 0, scale: 1 });
    const patch = {
        tiles: [tile],
        plug: getPortFromVertex(tile, ARTICULATED_PLUG_VERTEX_INDEX),
        sockets: socketIndices.map((index) => getPortFromVertex(tile, index)),
        transform: IDENTITY_TRANSFORM,
    };
    return patch;
}

export function createArticulatedPatchT(): SmithPatch {
    return { ...createArticulatedSpectre([12, 2]), patchFunctionKey: 'T' };
}

type ArticulatedLevel = {
    I?: SmithPatch;
    S: SmithPatch;
    N: SmithPatch;
    Aa: SmithPatch;
    Ab: SmithPatch;
    Ma: SmithPatch;
    Mb: SmithPatch;
};

type CompleteArticulatedLevel = ArticulatedLevel & { I: SmithPatch };

function composeI(
    S: SmithPatch,
    N: SmithPatch,
    Aa: SmithPatch,
    Ab: SmithPatch,
    Ma: SmithPatch,
): SmithPatch {
    const T = createArticulatedPatchT();
    const closedN = applyPatch(N, [EMPTY_PATCH]);
    const closedMa = applyPatch(Ma, [EMPTY_PATCH]);

    const t = applyPatch(T, [Aa, closedMa]);
    const aab = applyPatch(Ab, [t, closedN]);
    const ss = applyPatch(S, [aab]);
    const aa = applyPatch(Aa, [closedN, ss]);
    const tt = applyPatch(T, [closedMa, aa]);
    const patch = applyPatch(Ab, [tt, IDENTITY_PATCH]);
    return {
        ...patch,
        patchFunctionKey: 'I',
    };
}

function composeS(N: SmithPatch, Ab: SmithPatch, Ma: SmithPatch, Mb: SmithPatch): SmithPatch {
    const T = createArticulatedPatchT();
    const closedN = applyPatch(N, [EMPTY_PATCH]);
    const closedMa = applyPatch(Ma, [EMPTY_PATCH]);

    // Caution: 図ではMa, Mbがすべて閉じているように略されている
    // T(Ma, Ma)→T(Ma, Ma(x))
    const tm = applyPatch(T, [closedMa, Ma]);
    const mm = applyPatch(Ma, [applyPatch(Ab, [tm, closedN])]);
    const tt = applyPatch(T, [mm, closedMa]);
    const patch = applyPatch(Mb, [tt]);
    return {
        ...patch,
        patchFunctionKey: 'S',
    };
}

function composeN(S: SmithPatch, I: SmithPatch): SmithPatch {
    const closedS = applyPatch(S, [EMPTY_PATCH]);
    const patch = applyPatch(S, [applyPatch(I, [closedS, S, closedS])]);
    return {
        ...patch,
        patchFunctionKey: 'N',
    };
}

function composeAa(Ma: SmithPatch, I: SmithPatch, S: SmithPatch): SmithPatch {
    const closedS = applyPatch(S, [EMPTY_PATCH]);
    const patch = applyPatch(Ma, [applyPatch(I, [IDENTITY_PATCH, IDENTITY_PATCH, closedS])]);
    return {
        ...patch,
        patchFunctionKey: 'Aa',
    };
}

function composeAb(Mb: SmithPatch, I: SmithPatch, S: SmithPatch): SmithPatch {
    const closedS = applyPatch(S, [EMPTY_PATCH]);
    const patch = applyPatch(I, [closedS, Mb, IDENTITY_PATCH]);
    return {
        ...patch,
        patchFunctionKey: 'Ab',
    };
}

function composeMa(N: SmithPatch, Aa: SmithPatch): SmithPatch {
    const closedN = applyPatch(N, [EMPTY_PATCH]);
    const patch = applyPatch(Aa, [closedN, N]);
    return {
        ...patch,
        patchFunctionKey: 'Ma',
    };
}

function composeMb(N: SmithPatch, Ab: SmithPatch): SmithPatch {
    const closedN = applyPatch(N, [EMPTY_PATCH]);
    const patch = applyPatch(N, [applyPatch(Ab, [IDENTITY_PATCH, closedN])]);
    return {
        ...patch,
        patchFunctionKey: 'Mb',
    };
}

export const S0 = IDENTITY_PATCH;
export const N0: SmithPatch = {
    ...createArticulatedSpectre([10]),
    patchFunctionKey: 'N',
};
export const Aa0: SmithPatch = {
    ...createArticulatedSpectre([8, 10]),
    patchFunctionKey: 'Aa',
};
export const Ab0: SmithPatch = {
    ...createArticulatedSpectre([12, 0]),
    patchFunctionKey: 'Ab',
};
export const Ma0 = composeMa(N0, Aa0);
export const Mb0 = composeMb(N0, Ab0);

const level0: ArticulatedLevel = {
    I: undefined,
    S: IDENTITY_PATCH,
    N: N0,
    Aa: Aa0,
    Ab: Ab0,
    Ma: Ma0,
    Mb: Mb0,
};

function nextArticulatedLevel(prev: ArticulatedLevel): CompleteArticulatedLevel {
    const I = composeI(prev.S, prev.N, prev.Aa, prev.Ab, prev.Ma);
    const S = composeS(prev.N, prev.Ab, prev.Ma, prev.Mb);
    const N = I ? composeN(S, I) : N0;
    const Aa = I ? composeAa(prev.Ma, I, S) : Aa0;
    const Ab = I ? composeAb(prev.Mb, I, S) : Ab0;
    const Ma = composeMa(N, Aa);
    const Mb = composeMb(N, Ab);
    return {
        I,
        S,
        N,
        Aa,
        Ab,
        Ma,
        Mb,
    };
}

const level1 = nextArticulatedLevel(level0);
const level2 = nextArticulatedLevel(level1);

export const colorMap: Record<PatchFunctionKey, string> = {
    I: 'orange',
    S: 'yellow',
    N: 'cyan',
    Aa: 'pink',
    Ab: 'red',
    Ma: 'limegreen',
    Mb: 'darkgreen',
    T: 'purple',
    empty: '',
    id: '',
};

/** A colored component group for rendering: one fill and the tiles it covers. */
export type PatchColorGroup = { fill: string; tiles: readonly SmithTile[] };

/**
 * The color-coded component groups of a patch: each named component paired with
 * its `colorMap` color, skipping the colorless `empty`/`id` markers and any
 * component with no tiles. Falls back to the patch itself when it records no
 * components (e.g. a bare named leaf like N0), so a single leaf still gets its
 * own color.
 */
export function patchColorGroups(patch: SmithPatch): PatchColorGroup[] {
    const components = patch.components && patch.components.length > 0 ? patch.components : [patch];
    const groups: PatchColorGroup[] = [];
    for (const c of components) {
        if (c.patchFunctionKey === undefined) continue;
        const fill = colorMap[c.patchFunctionKey];
        if (!fill || c.tiles.length === 0) continue; // empty / id are colorless
        groups.push({ fill, tiles: c.tiles });
    }
    return groups;
}

/** Selectable prebuilt patches, keyed for the UI. Single source of truth: the
 *  `satisfies` keeps each value type-checked while `PatchKey` is derived. */
export const PATCHES = {
    S0,
    N0,
    Aa0,
    Ab0,
    Ma0,
    Mb0,
    I1: level1.I,
    S1: level1.S,
    N1: level1.N,
    Aa1: level1.Aa,
    Ab1: level1.Ab,
    Ma1: level1.Ma,
    Mb1: level1.Mb,
    I2: level2.I,
    S2: level2.S,
    N2: level2.N,
    Aa2: level2.Aa,
    Ab2: level2.Ab,
    Ma2: level2.Ma,
    Mb2: level2.Mb,
} satisfies Record<string, SmithPatch>;
export type PatchKey = keyof typeof PATCHES;
