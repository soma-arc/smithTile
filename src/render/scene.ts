/**
 * Scene — the backend-agnostic drawing model (a "display list").
 *
 * `buildScene(world, camera)` turns the current world (tile parameters +
 * overlays) into an ordered list of primitive `Drawable`s. This is the single
 * contract every backend consumes: `SvgBackend` maps it to JSX, a future
 * `CanvasBackend` iterates it against a 2D context. No DOM here — pure and
 * unit-testable.
 *
 * Coordinates are in **screen space** (already projected via `camera`), and
 * sizes are in pixels. Projection-dependent geometry (arrow orientation, label
 * offsets — which depend on the Y-flip) is therefore resolved once, here, so
 * every backend renders pixel-identically.
 */

import {
    centroid,
    kitesInside,
    polykiteValid,
    transformedGridKites,
    transformKite,
} from '../kiteGrid';
import { createSmithTile, smithTileWorldVertices } from '../smithTile';
import type { Transform } from '../Transform';
import type { Vec2 } from '../Vec2';
import type { Camera } from './camera';
import { COLOR } from './colors';

export type StrokeCap = 'round' | 'butt';
export type StrokeJoin = 'round' | 'miter';

export type Style = {
    fill?: string;
    stroke?: string;
    width?: number;
    dash?: string;
    cap?: StrokeCap;
    join?: StrokeJoin;
    opacity?: number;
};

export type TextStyle = {
    fill: string;
    size: number;
    italic?: boolean;
    weight?: number;
    family?: string;
};

export type Drawable =
    | { kind: 'polygon'; points: readonly Vec2[]; style: Style }
    | { kind: 'segment'; a: Vec2; b: Vec2; style: Style }
    | { kind: 'circle'; center: Vec2; r: number; style: Style }
    | { kind: 'text'; at: Vec2; text: string; style: TextStyle };

export type SceneLayer = { id: string; items: Drawable[] };
export type Scene = { layers: SceneLayer[]; viewBox: readonly [number, number, number, number] };

/** The contract every render backend consumes. */
export type BackendProps = { scene: Scene };

export type Overlays = {
    grid: boolean;
    polykite: boolean;
    ab: boolean;
    vectors: boolean;
    vertexNums: boolean;
    lengths: boolean;
    angles: boolean;
    ports: boolean;
};

/** What exists in the world to be drawn. Tile list is future-proofed for tilings. */
export type SceneWorld = {
    a: number;
    b: number;
    transform: Transform;
    overlays: Overlays;
};

export function buildScene(world: SceneWorld, camera: Camera): Scene {
    const { a, b, transform, overlays } = world;
    const P = camera.project;

    const tile = createSmithTile(a, b, transform);
    const verts = tile.shape.vertices; // per-vertex geometry (angle, port candidate)
    const edges = tile.shape.edges; // per-edge geometry (A / B kind)
    const N = verts.length; // boundary vertex/edge count
    const localVertices = verts.map((v) => v.position); // for polykite math (untransformed)
    const V = smithTileWorldVertices(tile).map(P); // screen-space boundary
    const showDec = overlays.polykite && polykiteValid(a, b);

    const layers: SceneLayer[] = [];

    // 1. reference grid
    if (overlays.grid) {
        const items: Drawable[] = [];
        const grid = transformedGridKites(transform);
        for (const kite of grid) {
            items.push({
                kind: 'polygon',
                points: kite.map(P),
                style: { fill: 'none', stroke: COLOR.gridLine, width: 1 },
            });
        }
        for (const kite of grid) {
            items.push({
                kind: 'circle',
                center: P(kite[0]),
                r: 1.6,
                style: { fill: COLOR.gridDot },
            });
        }
        layers.push({ id: 'grid', items });
    }

    // 2. exact polykite decomposition
    if (showDec) {
        const items: Drawable[] = kitesInside(localVertices).map((kite, i) => ({
            kind: 'polygon',
            points: transformKite(kite, transform).map(P),
            style: {
                fill: i % 2 ? COLOR.decompFillOdd : COLOR.decompFillEven,
                stroke: COLOR.kiteStroke,
                width: 1,
            },
        }));
        layers.push({ id: 'decomposition', items });
    }

    // 3. tile fill (skipped when the decomposition provides the fill)
    if (!showDec) {
        layers.push({
            id: 'fill',
            items: [{ kind: 'polygon', points: V, style: { fill: COLOR.fill } }],
        });
    }

    // 4/5. boundary or A/B edge distinction
    if (!overlays.ab) {
        layers.push({
            id: 'boundary',
            items: [
                {
                    kind: 'polygon',
                    points: V,
                    style: { fill: 'none', stroke: COLOR.boundary, width: 2.4, join: 'round' },
                },
            ],
        });
    } else {
        const items: Drawable[] = [];
        for (let i = 0; i < N; i++) {
            const isA = edges[i].kind === 'A';
            items.push({
                kind: 'segment',
                a: V[i],
                b: V[(i + 1) % N],
                style: {
                    stroke: isA ? COLOR.aEdge : COLOR.bEdge,
                    width: 2.8,
                    dash: isA ? undefined : '6 4',
                    cap: 'round',
                },
            });
        }
        layers.push({ id: 'edges', items });
    }

    // 6. direction vectors (arrowheads at edge midpoints)
    if (overlays.vectors) {
        const items: Drawable[] = [];
        for (let i = 0; i < N; i++) {
            const p1 = V[i];
            const p2 = V[(i + 1) % N];
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2;
            const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const L = 7;
            const ax = mx + Math.cos(ang) * 3;
            const ay = my + Math.sin(ang) * 3;
            items.push({
                kind: 'polygon',
                points: [
                    { x: ax, y: ay },
                    { x: ax - Math.cos(ang - 0.5) * L, y: ay - Math.sin(ang - 0.5) * L },
                    { x: ax - Math.cos(ang + 0.5) * L, y: ay - Math.sin(ang + 0.5) * L },
                ],
                style: { fill: COLOR.vector },
            });
        }
        layers.push({ id: 'vectors', items });
    }

    // 7. edge-length labels (a / b)
    if (overlays.lengths) {
        const items: Drawable[] = [];
        for (let i = 0; i < N; i++) {
            const p1 = V[i];
            const p2 = V[(i + 1) % N];
            const isA = edges[i].kind === 'A';
            const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const nx = Math.sin(ang);
            const ny = -Math.cos(ang);
            items.push({
                kind: 'text',
                at: { x: (p1.x + p2.x) / 2 + nx * 13, y: (p1.y + p2.y) / 2 + ny * 13 },
                text: isA ? 'a' : 'b',
                style: {
                    fill: isA ? COLOR.aEdge : COLOR.bEdge,
                    size: 13,
                    italic: true,
                    family: 'Barlow, sans-serif',
                },
            });
        }
        layers.push({ id: 'lengths', items });
    }

    // 8. vertex numbers, or plain dots
    if (overlays.vertexNums) {
        const items: Drawable[] = [];
        for (let i = 0; i < N; i++) {
            items.push({
                kind: 'circle',
                center: V[i],
                r: 9,
                style: { fill: COLOR.vertexFill, stroke: COLOR.vertexDot, width: 1.4 },
            });
            items.push({
                kind: 'text',
                at: { x: V[i].x, y: V[i].y + 0.5 },
                text: String(i),
                style: {
                    fill: COLOR.vertexDot,
                    size: 10.5,
                    weight: 600,
                    family: 'Barlow Condensed, sans-serif',
                },
            });
        }
        layers.push({ id: 'vertices', items });
    } else {
        layers.push({
            id: 'vertices',
            items: V.map((p) => ({
                kind: 'circle',
                center: p,
                r: 2.4,
                style: { fill: COLOR.vertexDot },
            })),
        });
    }

    // port candidates: a colored ring around each socket/plug vertex, sitting
    // outside the vertex-number disc so both overlays can be shown together.
    if (overlays.ports) {
        const items: Drawable[] = [];
        for (let i = 0; i < N; i++) {
            const pc = verts[i].portCandidate;
            if (!pc) continue;
            items.push({
                kind: 'circle',
                center: V[i],
                r: 12,
                style: {
                    fill: 'none',
                    stroke: pc === 'socket' ? COLOR.socketRing : COLOR.plugRing,
                    width: 2.4,
                },
            });
        }
        layers.push({ id: 'ports', items });
    }

    // interior-angle labels (from the fixed vertex template), placed just
    // inside each vertex toward the tile's centroid.
    if (overlays.angles) {
        const c = centroid(V);
        const items: Drawable[] = [];
        for (let i = 0; i < N; i++) {
            const p = V[i];
            const dx = c.x - p.x;
            const dy = c.y - p.y;
            const len = Math.hypot(dx, dy) || 1;
            const off = 16;
            const deg = Math.round((verts[i].interiorAngle * 180) / Math.PI);
            items.push({
                kind: 'text',
                at: { x: p.x + (dx / len) * off, y: p.y + (dy / len) * off },
                text: `${deg}°`,
                style: {
                    fill: COLOR.vertexDot,
                    size: 10.5,
                    weight: 600,
                    family: 'Barlow Condensed, sans-serif',
                },
            });
        }
        layers.push({ id: 'angles', items });
    }

    return { layers, viewBox: camera.viewBox };
}
