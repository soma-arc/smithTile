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
import type { PatchColorGroup, Port } from '../smithPatch';
import {
    type BoundarySegment,
    type SmithTile,
    smithTileBoundary,
    smithTileWorldVertices,
} from '../smithTile';
import { applyTransform, IDENTITY_TRANSFORM } from '../Transform';
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
    | {
          kind: 'path';
          segments: readonly BoundarySegment[];
          closed: boolean;
          style: Style;
      }
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
    vertexDots: boolean;
    lengths: boolean;
    angles: boolean;
    ports: boolean;
};

/** Patch connection ports: the single plug plus the remaining open sockets. */
export type PatchPorts = { plug: Port; sockets: readonly Port[] };

/**
 * What exists in the world to be drawn: a set of placed tiles plus optional
 * patch connection ports. A single interactive Tile(a, b) is just one tile;
 * a composed patch (e.g. T2x) is its full tile list.
 */
export type SceneWorld = {
    tiles: readonly SmithTile[];
    overlays: Overlays;
    ports?: PatchPorts;
    /**
     * Per-component fill colors for a patch (see `patchColorGroups`). When set,
     * the fill layer paints each group's tiles in its color instead of the flat
     * `COLOR.fill`.
     */
    componentFills?: readonly PatchColorGroup[];
    /**
     * Per-component outline segments for a patch (see `componentBorders`). When
     * set, each component's boundary is stroked on top of the fill.
     */
    componentBorders?: readonly { color: string; segments: readonly (readonly [Vec2, Vec2])[] }[];
};

/** Per-tile geometry resolved once: screen vertices + local vertices + flags. */
type TileGeom = {
    tile: SmithTile;
    verts: SmithTile['shape']['vertices'];
    edges: SmithTile['shape']['edges'];
    local: Vec2[]; // untransformed, for polykite math
    V: Vec2[]; // screen-space boundary
    boundary: readonly BoundarySegment[]; // screen-space curved/straight boundary
    curved: boolean;
    showDec: boolean;
    N: number;
};

function mapBoundarySegment(segment: BoundarySegment, map: (p: Vec2) => Vec2): BoundarySegment {
    switch (segment.kind) {
        case 'line':
            return { kind: 'line', p0: map(segment.p0), p1: map(segment.p1) };
        case 'cubicBezier':
            return {
                kind: 'cubicBezier',
                p0: map(segment.p0),
                c1: map(segment.c1),
                c2: map(segment.c2),
                p1: map(segment.p1),
            };
        case 'polyline':
            return { kind: 'polyline', points: segment.points.map(map) };
    }
}

/**
 * A port drawn as a short arrow from its position along its inward heading.
 * The screen direction is derived from two projected points so it tracks the
 * camera's rotation and Y-flip, exactly like the edge-vector arrowheads.
 */
function portArrow(port: Port, color: string, P: (p: Vec2) => Vec2, label?: string): Drawable[] {
    const base = P(port.position);
    const eps = 1e-3;
    const ahead = P({
        x: port.position.x + Math.cos(port.inwardAngleRad) * eps,
        y: port.position.y + Math.sin(port.inwardAngleRad) * eps,
    });
    const ang = Math.atan2(ahead.y - base.y, ahead.x - base.x);
    const L = 24;
    const head = 8;
    const tip = { x: base.x + Math.cos(ang) * L, y: base.y + Math.sin(ang) * L };
    const items: Drawable[] = [
        { kind: 'circle', center: base, r: 3, style: { fill: color } },
        { kind: 'segment', a: base, b: tip, style: { stroke: color, width: 2.4, cap: 'round' } },
        {
            kind: 'polygon',
            points: [
                tip,
                { x: tip.x - Math.cos(ang - 0.5) * head, y: tip.y - Math.sin(ang - 0.5) * head },
                { x: tip.x - Math.cos(ang + 0.5) * head, y: tip.y - Math.sin(ang + 0.5) * head },
            ],
            style: { fill: color },
        },
    ];
    // Order label, placed just beyond the arrow tip along its heading.
    if (label !== undefined) {
        items.push({
            kind: 'text',
            at: { x: base.x + Math.cos(ang) * (L + 11), y: base.y + Math.sin(ang) * (L + 11) },
            text: label,
            style: {
                fill: color,
                size: 12,
                weight: 700,
                family: 'Barlow Condensed, sans-serif',
            },
        });
    }
    return items;
}

export function buildScene(world: SceneWorld, camera: Camera): Scene {
    const { overlays } = world;
    const P = camera.project;

    const geoms: TileGeom[] = world.tiles.map((tile) => {
        const verts = tile.shape.vertices;
        const projectLocal = (point: Vec2) => P(applyTransform(tile.transform, point));
        return {
            tile,
            verts,
            edges: tile.shape.edges,
            local: verts.map((v) => v.position),
            V: smithTileWorldVertices(tile).map(P),
            boundary: smithTileBoundary(tile.shape).map((segment) =>
                mapBoundarySegment(segment, projectLocal),
            ),
            curved: tile.shape.edgeCurve.kind !== 'straight',
            showDec: overlays.polykite && polykiteValid(tile.shape.a, tile.shape.b),
            N: verts.length,
        };
    });

    const layers: SceneLayer[] = [];

    // 1. reference grid (world lattice, shared by all tiles)
    if (overlays.grid) {
        const items: Drawable[] = [];
        const grid = transformedGridKites(IDENTITY_TRANSFORM);
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

    // 2. exact polykite decomposition (per tile, where the ratio is valid)
    {
        const items: Drawable[] = [];
        for (const g of geoms) {
            if (!g.showDec) continue;
            kitesInside(g.local).forEach((kite, i) => {
                items.push({
                    kind: 'polygon',
                    points: transformKite(kite, g.tile.transform).map(P),
                    style: {
                        fill: i % 2 ? COLOR.decompFillOdd : COLOR.decompFillEven,
                        stroke: COLOR.kiteStroke,
                        width: 1,
                    },
                });
            });
        }
        if (items.length) layers.push({ id: 'decomposition', items });
    }

    // 3. tile fill (per tile, skipped where the decomposition provides the fill).
    // When component colors are supplied, each group paints its own tiles;
    // otherwise every tile gets the flat fill.
    {
        const items: Drawable[] = [];
        if (world.componentFills) {
            for (const group of world.componentFills) {
                for (const tile of group.tiles) {
                    items.push({
                        kind: 'polygon',
                        points: smithTileWorldVertices(tile).map(P),
                        style: { fill: group.fill },
                    });
                }
            }
        } else {
            for (const g of geoms) {
                if (g.showDec) continue;
                items.push(
                    g.curved
                        ? {
                              kind: 'path',
                              segments: g.boundary,
                              closed: true,
                              style: { fill: COLOR.fill },
                          }
                        : { kind: 'polygon', points: g.V, style: { fill: COLOR.fill } },
                );
            }
        }
        if (items.length) layers.push({ id: 'fill', items });
    }

    // 4/5. boundary or A/B edge distinction. Under component borders the per-tile
    // grid recedes to a faint line so the bold component seams dominate.
    if (!overlays.ab) {
        const faint = !!world.componentBorders;
        const items: Drawable[] = geoms.map((g) => {
            const style: Style = {
                fill: 'none',
                stroke: faint ? COLOR.tileGridFaint : COLOR.boundary,
                width: faint ? 1 : 2.4,
                join: 'round',
            };
            return g.curved
                ? { kind: 'path', segments: g.boundary, closed: true, style }
                : { kind: 'polygon', points: g.V, style };
        });
        layers.push({ id: 'boundary', items });
    } else {
        const items: Drawable[] = [];
        for (const g of geoms) {
            for (let i = 0; i < g.N; i++) {
                const isA = g.edges[i].kind === 'A';
                const style: Style = {
                    stroke: isA ? COLOR.aEdge : COLOR.bEdge,
                    width: 2.8,
                    dash: isA ? undefined : '6 4',
                    cap: 'round',
                };
                items.push(
                    g.curved
                        ? { kind: 'path', segments: [g.boundary[i]], closed: false, style }
                        : {
                              kind: 'segment',
                              a: g.V[i],
                              b: g.V[(i + 1) % g.N],
                              style,
                          },
                );
            }
        }
        layers.push({ id: 'edges', items });
    }

    // 6. direction vectors (arrowheads at edge midpoints)
    if (overlays.vectors) {
        const items: Drawable[] = [];
        for (const g of geoms) {
            for (let i = 0; i < g.N; i++) {
                const p1 = g.V[i];
                const p2 = g.V[(i + 1) % g.N];
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
        }
        layers.push({ id: 'vectors', items });
    }

    // 7. edge-length labels (a / b)
    if (overlays.lengths) {
        const items: Drawable[] = [];
        for (const g of geoms) {
            for (let i = 0; i < g.N; i++) {
                const p1 = g.V[i];
                const p2 = g.V[(i + 1) % g.N];
                const isA = g.edges[i].kind === 'A';
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
        }
        layers.push({ id: 'lengths', items });
    }

    // 8. vertex numbers, or plain dots
    if (overlays.vertexNums) {
        const items: Drawable[] = [];
        for (const g of geoms) {
            for (let i = 0; i < g.N; i++) {
                items.push({
                    kind: 'circle',
                    center: g.V[i],
                    r: 9,
                    style: { fill: COLOR.vertexFill, stroke: COLOR.vertexDot, width: 1.4 },
                });
                items.push({
                    kind: 'text',
                    at: { x: g.V[i].x, y: g.V[i].y + 0.5 },
                    text: String(i),
                    style: {
                        fill: COLOR.vertexDot,
                        size: 10.5,
                        weight: 600,
                        family: 'Barlow Condensed, sans-serif',
                    },
                });
            }
        }
        layers.push({ id: 'vertices', items });
    } else if (overlays.vertexDots) {
        const items: Drawable[] = [];
        for (const g of geoms) {
            for (const p of g.V) {
                items.push({ kind: 'circle', center: p, r: 2.4, style: { fill: COLOR.vertexDot } });
            }
        }
        layers.push({ id: 'vertices', items });
    }

    // port candidates: a colored ring around each socket/plug vertex, sitting
    // outside the vertex-number disc so both overlays can be shown together.
    if (overlays.ports) {
        const items: Drawable[] = [];
        for (const g of geoms) {
            for (let i = 0; i < g.N; i++) {
                const pc = g.verts[i].portCandidate;
                if (!pc) continue;
                items.push({
                    kind: 'circle',
                    center: g.V[i],
                    r: 12,
                    style: {
                        fill: 'none',
                        stroke: pc === 'socket' ? COLOR.socketRing : COLOR.plugRing,
                        width: 2.4,
                    },
                });
            }
        }
        layers.push({ id: 'ports', items });
    }

    // interior-angle labels, placed just inside each vertex toward the centroid.
    if (overlays.angles) {
        const items: Drawable[] = [];
        for (const g of geoms) {
            const c = centroid(g.V);
            for (let i = 0; i < g.N; i++) {
                const p = g.V[i];
                const dx = c.x - p.x;
                const dy = c.y - p.y;
                const len = Math.hypot(dx, dy) || 1;
                const off = 16;
                const deg = Math.round((g.verts[i].interiorAngle * 180) / Math.PI);
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
        }
        layers.push({ id: 'angles', items });
    }

    // patch connection ports (plug + open sockets) drawn as colored arrows.
    if (world.ports) {
        const items: Drawable[] = [...portArrow(world.ports.plug, COLOR.plugRing, P)];
        world.ports.sockets.forEach((socket, i) => {
            items.push(...portArrow(socket, COLOR.socketRing, P, String(i)));
        });
        layers.push({ id: 'patch-ports', items });
    }

    // Topmost: per-component outlines (patch structure), a bold dark line over
    // the now-faint tile grid so each component's shape reads clearly.
    if (world.componentBorders) {
        const items: Drawable[] = [];
        for (const group of world.componentBorders) {
            for (const [a, b] of group.segments) {
                items.push({
                    kind: 'segment',
                    a: P(a),
                    b: P(b),
                    style: { stroke: COLOR.componentBorder, width: 3.4, cap: 'round' },
                });
            }
        }
        if (items.length) layers.push({ id: 'component-borders', items });
    }

    return { layers, viewBox: camera.viewBox };
}
