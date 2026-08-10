/**
 * Render-core tests — the backend-agnostic Scene builder and Camera.
 * Pure (no DOM), so this runs in the node environment.
 */

import { describe, expect, it } from 'vitest';
import { IDENTITY_TRANSFORM } from '../Transform';
import { CANVAS_H, CANVAS_W, createCamera } from './camera';
import { buildScene, type Overlays, type SceneWorld } from './scene';

const NO_OVERLAYS: Overlays = {
    grid: false,
    polykite: false,
    ab: false,
    vectors: false,
    vertexNums: false,
    lengths: false,
};

function world(overlays: Partial<Overlays> = {}, a = 1, b = Math.sqrt(3)): SceneWorld {
    return { a, b, transform: IDENTITY_TRANSFORM, overlays: { ...NO_OVERLAYS, ...overlays } };
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
