/**
 * Geometry tests for the SmithTile / Tile(a, b) family — the invariants from
 * implementation-policy §12, plus the transform layer.
 *
 * Everything under test is pure (no DOM), so the suite runs in the default
 * `node` environment. Geometry is obtained through the public SmithTile API
 * (`createSmithTile`), not the private vertex builders.
 */

import { describe, expect, it } from 'vitest';
import { gridKites, hatKites, polykiteValid, transformedGridKites } from './kiteGrid';
import {
    closureError,
    createSmithTile,
    DEFAULT_SPECTRE_CURVE,
    EDGE_COUNT,
    EDGE_TEMPLATE,
    isAperiodic,
    polygonArea,
    SQRT3,
    smithTileBoundary,
    smithTileWorldVertices,
    validateParameters,
} from './smithTile';
import { applyTransform, IDENTITY_TRANSFORM, type Transform } from './Transform';
import type { Vec2 } from './Vec2';

const TOL = 1e-9;

function dist(p: Vec2, q: Vec2): number {
    return Math.hypot(p.x - q.x, p.y - q.y);
}

/** Local (untransformed) boundary vertices via the public SmithTile API. */
function positions(a: number, b: number): readonly Vec2[] {
    return createSmithTile(a, b, IDENTITY_TRANSFORM).shape.vertices.map((v) => v.position);
}

describe('Tile(a, b) boundary', () => {
    it.each([
        [1, SQRT3],
        [SQRT3, 1],
        [1, 1],
        [2, 1],
        [1, 4],
        [0.3, 2.7],
    ])('closes for (a=%f, b=%f)', (a, b) => {
        expect(closureError(a, b)).toBeLessThan(TOL);
    });

    it('assigns each edge the length of its kind (a for A, b for B)', () => {
        const a = 1.3;
        const b = 2.1;
        const V = positions(a, b);
        for (let i = 0; i < EDGE_COUNT; i++) {
            const next = V[(i + 1) % EDGE_COUNT];
            const expected = EDGE_TEMPLATE[i].kind === 'A' ? a : b;
            expect(dist(V[i], next)).toBeCloseTo(expected, 9);
        }
    });
});

describe('Spectre curved boundary', () => {
    it('creates one continuous cubic Bézier segment for each edge', () => {
        const tile = createSmithTile(1, 1, IDENTITY_TRANSFORM, DEFAULT_SPECTRE_CURVE);
        const boundary = smithTileBoundary(tile.shape);

        expect(boundary).toHaveLength(EDGE_COUNT);
        expect(boundary.every((segment) => segment.kind === 'cubicBezier')).toBe(true);
        for (let i = 0; i < boundary.length; i++) {
            const segment = boundary[i];
            const next = boundary[(i + 1) % boundary.length];
            if (segment.kind !== 'cubicBezier' || next.kind !== 'cubicBezier') continue;
            expect(dist(segment.p1, next.p0)).toBeLessThan(TOL);
        }
    });
});

describe('edge template', () => {
    it('has every direction as an integer multiple of 30° in [0, 12)', () => {
        for (const e of EDGE_TEMPLATE) {
            expect(Number.isInteger(e.direction)).toBe(true);
            expect(e.direction).toBeGreaterThanOrEqual(0);
            expect(e.direction).toBeLessThan(12);
        }
    });

    it('has 8 A-edges and 6 B-edges', () => {
        expect(EDGE_TEMPLATE.filter((e) => e.kind === 'A')).toHaveLength(8);
        expect(EDGE_TEMPLATE.filter((e) => e.kind === 'B')).toHaveLength(6);
    });
});

describe('interior angles', () => {
    // Angle structure is (a, b)-independent; read it off any concrete tile.
    const vertices = createSmithTile(1, SQRT3, IDENTITY_TRANSFORM).shape.vertices;
    const degs = vertices.map((v) => Math.round((v.interiorAngle * 180) / Math.PI));

    it('matches the Hat interior-angle sequence', () => {
        expect(degs).toEqual([120, 270, 120, 90, 240, 90, 240, 90, 120, 180, 120, 270, 120, 90]);
    });

    it('sums to (n-2)·180° for the 14-gon', () => {
        const sum = degs.reduce((s, d) => s + d, 0);
        expect(sum).toBe((EDGE_COUNT - 2) * 180); // 2160
    });

    it('flags 120° vertices as sockets and 240° as plugs', () => {
        for (const v of vertices) {
            const deg = Math.round((v.interiorAngle * 180) / Math.PI);
            if (deg === 120) expect(v.portCandidate).toBe('socket');
            else if (deg === 240) expect(v.portCandidate).toBe('plug');
            else expect(v.portCandidate).toBeNull();
        }
    });
});

describe('scaling and linearity', () => {
    it('gives the Hat, Tile(1, √3), an area of 8√3', () => {
        expect(polygonArea(positions(1, SQRT3))).toBeCloseTo(8 * SQRT3, 9);
    });

    it('satisfies Tile(ka, kb) = k · Tile(a, b)', () => {
        const a = 1.1;
        const b = 2.3;
        const k = 2.5;
        const V = positions(a, b);
        const W = positions(k * a, k * b);
        for (let i = 0; i < EDGE_COUNT; i++) {
            expect(dist(W[i], { x: k * V[i].x, y: k * V[i].y })).toBeLessThan(TOL);
        }
    });

    it('satisfies the linear basis P(a, b) = a·P(1, 0) + b·P(0, 1)', () => {
        const a = 1.7;
        const b = 0.6;
        const V = positions(a, b);
        const basisA = positions(1, 0);
        const basisB = positions(0, 1);
        for (let i = 0; i < EDGE_COUNT; i++) {
            const combined = {
                x: a * basisA[i].x + b * basisB[i].x,
                y: a * basisA[i].y + b * basisB[i].y,
            };
            expect(dist(V[i], combined)).toBeLessThan(TOL);
        }
    });
});

describe('parameter validation', () => {
    it('rejects a = b = 0', () => {
        expect(() => validateParameters(0, 0)).toThrow();
    });

    it('rejects negative parameters', () => {
        expect(() => validateParameters(-1, 1)).toThrow();
        expect(() => validateParameters(1, -1)).toThrow();
    });

    it('accepts the degenerate exception points Comet (1, 0) and Chevron (0, 1)', () => {
        expect(() => validateParameters(1, 0)).not.toThrow();
        expect(() => validateParameters(0, 1)).not.toThrow();
    });
});

describe('classification', () => {
    it.each([
        ['hat', 1, SQRT3, true],
        ['turtle', SQRT3, 1, true],
        ['generic Tile(1,4)', 1, 4, true],
        ['comet', 1, 0, false],
        ['chevron', 0, 1, false],
        ['t11', 1, 1, false],
    ])('classifies %s as aperiodic=%s', (_name, a, b, expected) => {
        expect(isAperiodic(createSmithTile(a, b, IDENTITY_TRANSFORM))).toBe(expected);
    });
});

describe('Transform', () => {
    it('leaves points unchanged under the identity transform', () => {
        const p = { x: 3, y: -2 };
        expect(applyTransform(IDENTITY_TRANSFORM, p)).toEqual(p);
    });

    it('rotates +90° counterclockwise: (1, 0) → (0, 1)', () => {
        const rot: Transform = { position: { x: 0, y: 0 }, rotation: Math.PI / 2, scale: 1 };
        const r = applyTransform(rot, { x: 1, y: 0 });
        expect(r.x).toBeCloseTo(0, 9);
        expect(r.y).toBeCloseTo(1, 9);
    });

    it('applies scale → rotate → translate in order', () => {
        const t: Transform = { position: { x: 10, y: 5 }, rotation: Math.PI / 2, scale: 2 };
        // (1,0) → scale 2 → (2,0) → rot 90° → (0,2) → translate → (10,7)
        const r = applyTransform(t, { x: 1, y: 0 });
        expect(r.x).toBeCloseTo(10, 9);
        expect(r.y).toBeCloseTo(7, 9);
    });

    it('places the tile in world space via smithTileWorldVertices (translation)', () => {
        const offset = { x: 12, y: -4 };
        const t: Transform = { position: offset, rotation: 0, scale: 1 };
        const local = positions(1, SQRT3);
        const world = smithTileWorldVertices(createSmithTile(1, SQRT3, t));
        for (let i = 0; i < EDGE_COUNT; i++) {
            expect(
                dist(world[i], { x: local[i].x + offset.x, y: local[i].y + offset.y }),
            ).toBeLessThan(TOL);
        }
    });
});

describe('polykite structure', () => {
    it('decomposes the Hat into exactly 8 kites', () => {
        expect(hatKites()).toHaveLength(8);
        expect(polykiteValid(1, SQRT3)).toBe(true);
    });

    it('does not place the Turtle, Tile(√3, 1), on the Hat kite grid', () => {
        expect(polykiteValid(SQRT3, 1)).toBe(false);
    });

    it('rejects general ratios such as Tile(1, 4) as polykites', () => {
        expect(polykiteValid(1, 4)).toBe(false);
    });

    it('scales the drawn grid by the transform (scale 2 doubles every point)', () => {
        const base = gridKites();
        const scaled = transformedGridKites({ position: { x: 0, y: 0 }, rotation: 0, scale: 2 });
        expect(scaled).toHaveLength(base.length);
        expect(dist(scaled[0][0], { x: base[0][0].x * 2, y: base[0][0].y * 2 })).toBeLessThan(TOL);
    });
});
