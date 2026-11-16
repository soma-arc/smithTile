/** Shared plug/socket composition with exact integer 30-degree headings. */
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

export type DirectedPort = { position: Vec2; direction: number };
export type PlacedTile = SmithTile & { rotationSteps: number; mirrored: boolean };
export type PatchComponent<K extends string> = {
    kind: K;
    level: number;
    tiles: readonly PlacedTile[];
};
export type Patch<K extends string> = {
    tiles: readonly PlacedTile[];
    plug: DirectedPort;
    sockets: readonly DirectedPort[];
    components: readonly PatchComponent<K>[];
    kind?: K;
    level: number;
};
export type NamedPatch<K extends string> = Patch<K> & { kind: K };
const direction = (step: number) => ((step % 12) + 12) % 12;
export const PATCH_ORIGIN = { x: 0, y: 0 };

export function patchPort(port: DirectedPort): Port {
    return { position: port.position, inwardAngleRad: (port.direction * Math.PI) / 6 };
}

export function createPatchTile(a: number, b: number): PlacedTile {
    return { ...createSmithTile(a, b, IDENTITY_TRANSFORM), rotationSteps: 0, mirrored: false };
}

export function vertexPort(tile: PlacedTile, index: number): DirectedPort {
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

export function placePatch<K extends string>(
    patch: Patch<K>,
    translation: Vec2,
    rotationSteps: number,
    mirrored = false,
): Patch<K> {
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

export function patchParts<K extends string>(patch: Patch<K>): readonly PatchComponent<K>[] {
    return patch.kind
        ? [{ kind: patch.kind, level: patch.level, tiles: patch.tiles }]
        : patch.components;
}

export function attachPatch<K extends string>(
    parent: Patch<K>,
    socketIndex: number,
    child: Patch<K>,
): Patch<K> {
    if (!Number.isInteger(socketIndex) || socketIndex < 0 || socketIndex >= parent.sockets.length) {
        throw new RangeError(`Invalid socket index ${socketIndex}`);
    }
    const socket = parent.sockets[socketIndex];
    const steps = direction(socket.direction + 6 - child.plug.direction);
    const rotated = applyTransform(
        createTransform(PATCH_ORIGIN, (steps * Math.PI) / 6),
        child.plug.position,
    );
    const placed = placePatch(
        child,
        { x: socket.position.x - rotated.x, y: socket.position.y - rotated.y },
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
        components: [...patchParts(parent), ...patchParts(placed)],
        level: parent.level,
    };
}

export function applyPatch<K extends string>(fn: Patch<K>, args: readonly Patch<K>[]): Patch<K> {
    if (args.length !== fn.sockets.length)
        throw new RangeError(`Expected ${fn.sockets.length} arguments, got ${args.length}`);
    let result = fn;
    for (let i = args.length - 1; i >= 0; i--) result = attachPatch(result, i, args[i]);
    return result;
}

export const EMPTY_PATCH: Patch<never> = {
    tiles: [],
    plug: { position: PATCH_ORIGIN, direction: 0 },
    sockets: [],
    components: [],
    level: 0,
};
export const IDENTITY_PATCH: Patch<never> = {
    ...EMPTY_PATCH,
    sockets: [{ position: PATCH_ORIGIN, direction: 6 }],
};
export function namePatch<K extends string>(
    patch: Patch<K>,
    kind: K,
    level: number,
): NamedPatch<K> {
    return { ...patch, kind, level };
}
export function closePatch<K extends string>(patch: Patch<K>): Patch<K> {
    return applyPatch(
        patch,
        patch.sockets.map(() => EMPTY_PATCH),
    );
}

export function patchColorGroups<K extends string>(
    patch: NamedPatch<K>,
    colors: Readonly<Record<K, string>>,
) {
    const components: readonly PatchComponent<K>[] = patch.components.length
        ? patch.components
        : [patch];
    return components
        .filter((part) => part.tiles.length > 0)
        .map((part) => ({ fill: colors[part.kind], tiles: part.tiles }));
}
