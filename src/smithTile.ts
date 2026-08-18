/**
 *
 * Tile(a, b) — geometry of the aperiodic monotile continuum.
 *
 * A `Tile(a, b)` shares the Hat's fixed boundary structure (edge directions and
 * cyclic order) and only changes two edge lengths:
 *   - A-edges have length `a`  (8 of them)
 *   - B-edges have length `b`  (6 of them)
 *
 * Every vertex is linear in (a, b): `P(a, b) = a·P(1, 0) + b·P(0, 1)`.
 *
 * This module is a self-contained, reusable geometry library — it has no DOM,
 * DesignSystem, or rendering dependencies.
 */

import { applyTransform, type Transform } from './Transform';
import type { Vec2 } from './Vec2';

export type EdgeKind = 'A' | 'B';
export type PortKind = 'plug' | 'socket';
export type PortCandidate = PortKind | null;

/** One edge of the tile boundary. `direction` is measured in 30° units. */
export interface EdgeSpec {
    kind: EdgeKind;
    /** Integer multiple of 30°. The actual angle is `direction * Math.PI / 6`. */
    direction: number;
}

type TileVertexSpec = {
    interiorAngle: number;
    portCandidate: PortCandidate;
    inwardDirection: number | null;
};

export const SQRT3 = Math.sqrt(3);

/**
 * The Hat's 14 boundary edges in cyclic order. Directions are kept as integer
 * multiples of 30° (never as floating-point radians) so the angle structure is
 * exact. Edge kind is consistent with direction parity: even → A, odd → B.
 *
 * Orientation: the whole template is rotated 180° from the raw construction so
 * the Hat's crown and brim sit in their correct places. In the coordinate
 * system +x → right, +y → up, positive rotation counterclockwise, a 180° turn
 * is `(direction + 6) mod 12`, which preserves parity (and thus each A/B kind).
 */
export const EDGE_TEMPLATE: readonly EdgeSpec[] = [
    { kind: 'A', direction: 6 }, // -x
    { kind: 'B', direction: 3 },
    { kind: 'B', direction: 5 },
    { kind: 'A', direction: 8 },
    { kind: 'A', direction: 6 },
    { kind: 'B', direction: 9 },
    { kind: 'B', direction: 7 },
    { kind: 'A', direction: 10 },
    { kind: 'A', direction: 0 }, // +x
    { kind: 'A', direction: 0 }, // +x
    { kind: 'A', direction: 2 },
    { kind: 'B', direction: 11 },
    { kind: 'B', direction: 1 },
    { kind: 'A', direction: 4 },
];

/** Number of boundary edges (and vertices). */
export const EDGE_COUNT = EDGE_TEMPLATE.length; // 14

/** Edge vector for one template edge at the given lengths. */
function edgeVector(edge: EdgeSpec, a: number, b: number): Vec2 {
    const length = edge.kind === 'A' ? a : b;
    const angle = (edge.direction * Math.PI) / 6;
    return { x: Math.cos(angle) * length, y: Math.sin(angle) * length };
}

const VERTEX_TEMPLATE: readonly TileVertexSpec[] = EDGE_TEMPLATE.map((edge, i) => {
    // Vertex i sits between the incoming edge[i-1] and the outgoing edge[i].
    const incoming = EDGE_TEMPLATE[(i + EDGE_COUNT - 1) % EDGE_COUNT];
    // Signed turn from incoming to outgoing direction, in 30° units, in (-6, 6].
    const raw = (((edge.direction - incoming.direction) % 12) + 12) % 12;
    const turn = raw > 6 ? raw - 12 : raw;
    // Interior angle = 180° − turn (reflex vertices exceed 180°), in 30° units.
    const interiorDirection = 6 - turn;
    const portCandidate =
        interiorDirection === 4 ? 'socket' : interiorDirection === 8 ? 'plug' : null; // 120° socket, 240° plug
    const inwardDirection =
        portCandidate !== null ? (edge.direction - interiorDirection / 2) % 12 : null;

    return { interiorAngle: interiorDirection * (Math.PI / 6), portCandidate, inwardDirection };
});

/** Throws if (a, b) is outside the valid domain. */
export function validateParameters(a: number, b: number): void {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
        throw new RangeError(`Tile(a, b): a and b must be finite (got ${a}, ${b})`);
    }
    if (a < 0 || b < 0) {
        throw new RangeError(`Tile(a, b): a and b must be >= 0 (got ${a}, ${b})`);
    }
    if (a === 0 && b === 0) {
        throw new RangeError('Tile(a, b): a and b cannot both be zero');
    }
}

/**
 * Closure error: magnitude of the sum of all edge vectors. For a valid tile the
 * boundary is closed, so this is ~0 for every (a, b).
 */
export function closureError(a: number, b: number): number {
    let x = 0;
    let y = 0;
    for (const edge of EDGE_TEMPLATE) {
        const e = edgeVector(edge, a, b);
        x += e.x;
        y += e.y;
    }
    return Math.hypot(x, y);
}

export type TileVertex = TileVertexSpec & {
    position: Vec2;
};

/** Boundary vertex positions for (a, b), by walking the edge template once. */
function basisPositions(a: number, b: number): Vec2[] {
    const out: Vec2[] = [];
    let p: Vec2 = { x: 0, y: 0 };
    for (let i = 0; i < EDGE_COUNT; i++) {
        out.push(p);
        const e = edgeVector(EDGE_TEMPLATE[i], a, b);
        p = { x: p.x + e.x, y: p.y + e.y };
    }
    return out;
}

/** Basis positions for a = 1, b = 0 and a = 0, b = 1, computed once. */
const BASIS_A: readonly Vec2[] = basisPositions(1, 0);
const BASIS_B: readonly Vec2[] = basisPositions(0, 1);

/**
 * Vertices for Tile(a, b). Positions use the linear basis
 * `P(a, b) = a·P(1, 0) + b·P(0, 1)`, so no trig runs per call; the per-vertex
 * angle / port metadata is (a, b)-independent and comes from VERTEX_TEMPLATE.
 */
function createTileVertices(a: number, b: number): readonly TileVertex[] {
    validateParameters(a, b);
    return VERTEX_TEMPLATE.map((spec, i) => ({
        position: {
            x: a * BASIS_A[i].x + b * BASIS_B[i].x,
            y: a * BASIS_A[i].y + b * BASIS_B[i].y,
        },
        ...spec,
    }));
}

/** Signed-area (shoelace) of a closed polygon given its vertices. */
export function polygonArea(vertices: readonly Vec2[]): number {
    let sum = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
        const p = vertices[i];
        const q = vertices[(i + 1) % n];
        sum += p.x * q.y - q.x * p.y;
    }
    return Math.abs(sum) / 2;
}

// ── presets ───────────────────────────────────────────────────────────────

export interface Preset {
    key: string;
    /** Localized display nickname. */
    nick: { ja: string; en: string };
    a: number;
    b: number;
}

export const PRESETS: readonly Preset[] = [
    { key: 'comet', nick: { ja: 'コメット', en: 'Comet' }, a: 1, b: 0 },
    { key: 't41', nick: { ja: 'Tile(4,1)', en: 'Tile(4,1)' }, a: 4, b: 1 },
    { key: 'turtle', nick: { ja: 'タートル', en: 'Turtle' }, a: SQRT3, b: 1 },
    { key: 't11', nick: { ja: 'Tile(1,1)', en: 'Tile(1,1)' }, a: 1, b: 1 },
    { key: 'hat', nick: { ja: 'ハット', en: 'Hat' }, a: 1, b: SQRT3 },
    { key: 't14', nick: { ja: 'Tile(1,4)', en: 'Tile(1,4)' }, a: 1, b: 4 },
    { key: 'chevron', nick: { ja: 'シェブロン', en: 'Chevron' }, a: 0, b: 1 },
];

export function findPreset(key: string): Preset | undefined {
    return PRESETS.find((p) => p.key === key);
}

type SmithTileShape = {
    a: number;
    b: number;
    /** Boundary vertices in cyclic order (position + interior angle + port candidate). */
    vertices: readonly TileVertex[];
    /** Boundary edges in cyclic order; edge i connects vertices[i] → vertices[i+1]. */
    edges: readonly EdgeSpec[];
};

export type SmithTile = {
    shape: SmithTileShape;
    transform: Transform;
};

//   const articulatedPorts: PortLayout = { plugVertexIndex: 4, socketVertices: [11, 1] }; // socket vertices are in CCW order
//   const wrigglyPorts: PortLayout = { plugVertexIndex: 6, socketVertices: [1, 11] }; // socket vertices are in CW order
export function createSmithTile(a: number, b: number, transform: Transform): SmithTile {
    validateParameters(a, b);
    const vertices = createTileVertices(a, b);
    const shape: SmithTileShape = { a, b, vertices, edges: EDGE_TEMPLATE };
    return { shape, transform };
}

/** The tile's boundary vertices in world space (its transform applied). */
export function smithTileWorldVertices(tile: SmithTile): Vec2[] {
    return tile.shape.vertices.map((v) => applyTransform(tile.transform, v.position));
}

export function isAperiodic(smithTile: SmithTile): boolean {
    const { a, b } = smithTile.shape;
    if (b === 0 && a > 0) return false; //'comet';
    if (a === 0 && b > 0) return false; //'chevron';
    if (Math.abs(a - b) < 1e-9) return false; // 't11';
    return true;
}
