/**
 * Render-core tests — the backend-agnostic Scene builder and Camera.
 * Pure (no DOM), so this runs in the node environment.
 */

import { describe, expect, it } from 'vitest';
import { Ma0 } from '../geometry/smithPatch';
import { createSmithTile, DEFAULT_SPECTRE_CURVE, smithTileWorldVertices } from '../geometry/smithTile';
import { IDENTITY_TRANSFORM } from '../geometry/Transform';
import { CANVAS_H, CANVAS_W, createCamera, createCenteredCamera } from './camera';
import { buildScene, type Overlays, type SceneWorld } from './scene';

const NO_OVERLAYS: Overlays = {
    grid: false,
    polykite: false,
    ab: false,
    vectors: false,
    vertexNums: false,
    vertexDots: true,
    lengths: false,
    angles: false,
    ports: false,
};

function world(overlays: Partial<Overlays> = {}, a = 1, b = Math.sqrt(3)): SceneWorld {
    return {
        tiles: [createSmithTile(a, b, IDENTITY_TRANSFORM)],
        overlays: { ...NO_OVERLAYS, ...overlays },
    };
}

const camera = createCamera(1);
const layerIds = (w: SceneWorld) => buildScene(w, camera).layers.map((l) => l.id);

describe('camera', () => {
    it('reports the logical viewBox', () => {
        expect(createCamera(1).viewBox).toEqual([0, 0, CANVAS_W, CANVAS_H]);
    });

    it('projects world points into the canvas box', () => {
        const p = createCamera(1).project({ x: 0, y: 0 });
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(CANVAS_W);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(CANVAS_H);
    });

    it('keeps the frame center fixed at the canvas center under any rotation', () => {
        const cam = createCamera(1, 90);
        const p = cam.project(cam.center);
        expect(p.x).toBeCloseTo(CANVAS_W / 2, 6);
        expect(p.y).toBeCloseTo(CANVAS_H / 2, 6);
    });

    it('rotates the view: a point right of center moves above center at +90°', () => {
        const cam = createCamera(1, 90);
        const right = { x: cam.center.x + 1, y: cam.center.y };
        const p = cam.project(right);
        expect(p.x).toBeCloseTo(CANVAS_W / 2, 6); // stays on the vertical center line
        expect(p.y).toBeLessThan(CANVAS_H / 2); // moved upward on screen
    });

    it('applies pan after zoom and rotation in logical screen units', () => {
        const cam = createCamera(7, 90, false, { x: 35, y: -18 });
        const p = cam.project(cam.center);
        expect(p.x).toBeCloseTo(CANVAS_W / 2 + 35, 6);
        expect(p.y).toBeCloseTo(CANVAS_H / 2 - 18, 6);
    });

    it('uses the same world scale for differently sized contents', () => {
        const small = createCenteredCamera([
            { x: 0, y: 0 },
            { x: 1, y: 1 },
        ]);
        const large = createCenteredCamera([
            { x: -100, y: -20 },
            { x: 100, y: 20 },
        ]);
        const projectedUnit = (cam: ReturnType<typeof createCenteredCamera>) => {
            const a = cam.project(cam.center);
            const b = cam.project({ x: cam.center.x + 1, y: cam.center.y });
            return Math.hypot(b.x - a.x, b.y - a.y);
        };
        expect(projectedUnit(small)).toBeCloseTo(projectedUnit(large), 10);
        expect(projectedUnit(createCenteredCamera([{ x: 0, y: 0 }], 2))).toBeCloseTo(
            projectedUnit(small) * 2,
            10,
        );
    });

    it('centers content without changing its scale', () => {
        const cam = createCenteredCamera([
            { x: 20, y: -8 },
            { x: 30, y: 12 },
        ]);
        expect(cam.center).toEqual({ x: 25, y: 2 });
        expect(cam.project(cam.center)).toEqual({ x: CANVAS_W / 2, y: CANVAS_H / 2 });
    });
});

describe('buildScene', () => {
    it('draws fill + boundary + vertices with no overlays', () => {
        expect(layerIds(world())).toEqual(['fill', 'boundary', 'vertices']);
    });

    it('adds the reference grid layer when enabled', () => {
        expect(layerIds(world({ grid: true }))).toContain('grid');
    });

    it('replaces fill with the decomposition for a valid polykite (Hat)', () => {
        const ids = layerIds(world({ polykite: true }, 1, Math.sqrt(3)));
        expect(ids).toContain('decomposition');
        expect(ids).not.toContain('fill');
    });

    it('keeps the plain fill when the ratio is not a polykite (Tile(1,4))', () => {
        const ids = layerIds(world({ polykite: true }, 1, 4));
        expect(ids).toContain('fill');
        expect(ids).not.toContain('decomposition');
    });

    it('switches the boundary to per-edge segments in A/B mode', () => {
        expect(layerIds(world())).toContain('boundary');
        const ab = buildScene(world({ ab: true }), camera);
        expect(ab.layers.map((l) => l.id)).toContain('edges');
        const edges = ab.layers.find((l) => l.id === 'edges');
        expect(edges?.items).toHaveLength(14);
        expect(edges?.items.every((d) => d.kind === 'segment')).toBe(true);
    });

    it('marks port candidates with 7 rings (5 sockets + 2 plugs) when enabled', () => {
        const ports = buildScene(world({ ports: true }), camera).layers.find(
            (l) => l.id === 'ports',
        );
        expect(ports?.items).toHaveLength(7);
        // all are unfilled rings
        expect(ports?.items.every((d) => d.kind === 'circle' && d.style.fill === 'none')).toBe(
            true,
        );
        const strokes =
            ports?.items.map((d) => (d.kind === 'circle' ? d.style.stroke : undefined)) ?? [];
        expect(strokes.filter((s) => s === '#5980a6')).toHaveLength(5); // sockets
        expect(strokes.filter((s) => s === '#c17d54')).toHaveLength(2); // plugs
    });

    it('adds 14 interior-angle text labels when enabled', () => {
        const angles = buildScene(world({ angles: true }), camera).layers.find(
            (l) => l.id === 'angles',
        );
        expect(angles?.items).toHaveLength(14);
        expect(angles?.items.every((d) => d.kind === 'text')).toBe(true);
    });

    it('produces 14 vertex-number circles+labels when enabled', () => {
        const vertices = buildScene(world({ vertexNums: true }), camera).layers.find(
            (l) => l.id === 'vertices',
        );
        expect(vertices?.items).toHaveLength(28); // 14 circles + 14 labels
    });

    it('emits scene coordinates inside the viewBox', () => {
        const fill = buildScene(world(), camera).layers.find((l) => l.id === 'fill');
        const poly = fill?.items[0];
        expect(poly?.kind).toBe('polygon');
        if (poly?.kind === 'polygon') {
            for (const p of poly.points) {
                expect(p.x).toBeGreaterThanOrEqual(0);
                expect(p.x).toBeLessThanOrEqual(CANVAS_W);
                expect(p.y).toBeGreaterThanOrEqual(0);
                expect(p.y).toBeLessThanOrEqual(CANVAS_H);
            }
        }
    });
});

describe('buildScene — Spectre boundary', () => {
    const spectreWorld: SceneWorld = {
        tiles: [createSmithTile(1, 1, IDENTITY_TRANSFORM)],
        edgeCurve: DEFAULT_SPECTRE_CURVE,
        overlays: NO_OVERLAYS,
    };

    it('uses the same closed Bézier path for fill and boundary', () => {
        const scene = buildScene(spectreWorld, camera);
        const fill = scene.layers.find((layer) => layer.id === 'fill')?.items[0];
        const boundary = scene.layers.find((layer) => layer.id === 'boundary')?.items[0];

        expect(fill?.kind).toBe('path');
        expect(boundary?.kind).toBe('path');
        if (fill?.kind === 'path' && boundary?.kind === 'path') {
            expect(fill.closed).toBe(true);
            expect(fill.segments).toHaveLength(14);
            expect(fill.segments.every((segment) => segment.kind === 'cubicBezier')).toBe(true);
            expect(boundary.segments).toEqual(fill.segments);
        }
    });

    it('keeps all 14 A/B edges as Bézier paths', () => {
        const scene = buildScene(
            { ...spectreWorld, overlays: { ...NO_OVERLAYS, ab: true } },
            camera,
        );
        const edges = scene.layers.find((layer) => layer.id === 'edges');
        expect(edges?.items).toHaveLength(14);
        expect(
            edges?.items.every(
                (item) =>
                    item.kind === 'path' &&
                    item.segments.length === 1 &&
                    item.segments[0].kind === 'cubicBezier',
            ),
        ).toBe(true);
    });
});

describe('buildScene — patches (multiple tiles)', () => {
    const patchPoints = Ma0.tiles.flatMap((t) => smithTileWorldVertices(t));
    const patchCam = createCenteredCamera(patchPoints);
    const patchWorld: SceneWorld = {
        tiles: Ma0.tiles,
        overlays: NO_OVERLAYS,
        ports: { plug: Ma0.plug, sockets: Ma0.sockets },
    };

    it('draws one boundary polygon per tile', () => {
        const boundary = buildScene(patchWorld, patchCam).layers.find((l) => l.id === 'boundary');
        expect(boundary?.items).toHaveLength(Ma0.tiles.length);
        expect(boundary?.items.every((d) => d.kind === 'polygon')).toBe(true);
    });

    it('draws the plug + open sockets as arrows in a patch-ports layer', () => {
        const ports = buildScene(patchWorld, patchCam).layers.find((l) => l.id === 'patch-ports');
        // plug arrow = 3 drawables (base dot + shaft + head); each socket adds a
        // 4th (its order label).
        const expected = 3 + Ma0.sockets.length * 4;
        expect(ports?.items).toHaveLength(expected);
    });

    it('omits the patch-ports layer when no ports are given', () => {
        const ids = buildScene({ tiles: Ma0.tiles, overlays: NO_OVERLAYS }, patchCam).layers.map(
            (l) => l.id,
        );
        expect(ids).not.toContain('patch-ports');
    });
});
