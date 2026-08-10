/**
 * SVG renderer for Tile(a, b). Draws, in layer order:
 *   1. reference kite grid          5. A/B edge distinction
 *   2. exact polykite decomposition 6. direction vectors
 *   3. tile fill                    7. edge-length labels
 *   4. tile boundary                8. vertex numbers / dots
 *
 * The camera is a *fixed* window derived once from the Hat and scaled only by
 * the zoom slider — never by (a, b). So the kite grid stays put and the tile
 * deforms in place rather than the view swimming as parameters change.
 */

import { kitesInside, polykiteValid, transformedGridKites, transformKite } from './kiteGrid';
import {
    createSmithTile,
    EDGE_COUNT,
    EDGE_TEMPLATE,
    SQRT3,
    smithTileWorldVertices,
} from './smithTile';
import { IDENTITY_TRANSFORM, type Transform } from './Transform';
import type { Vec2 } from './Vec2';

const SVGNS = 'http://www.w3.org/2000/svg';

export interface RenderState {
    a: number;
    b: number;
    zoom: number;
    showGrid: boolean;
    showPolykite: boolean;
    showAB: boolean;
    showVectors: boolean;
    showVertexNums: boolean;
    showLengths: boolean;
    /** Optional placement of the tile (and the grid drawn with it). */
    transform?: Transform;
}

const COLOR = {
    aEdge: '#5980a6',
    bEdge: '#1d2d3d',
    boundary: '#1d2d3d',
    fill: 'rgba(89,128,166,0.13)',
    gridLine: '#c3c3c6',
    gridDot: '#b7b7ba',
    kiteStroke: '#416180',
    vector: '#416180',
    vertexFill: '#f2f2f3',
    vertexDot: '#1d2d3d',
};

const W = 940;
const H = 640;
const PAD = 54;

/** Fixed reference frame computed once from the Hat's extent. */
let refFrameCache: { cx: number; cy: number; w: number; h: number } | null = null;
function refFrame() {
    if (refFrameCache) return refFrameCache;
    const hat = createSmithTile(1, SQRT3, IDENTITY_TRANSFORM).definition.shape.vertices;
    let mnx = Infinity;
    let mny = Infinity;
    let mxx = -Infinity;
    let mxy = -Infinity;
    for (const p of hat) {
        mnx = Math.min(mnx, p.x);
        mny = Math.min(mny, p.y);
        mxx = Math.max(mxx, p.x);
        mxy = Math.max(mxy, p.y);
    }
    const mx = (mxx - mnx) * 0.28;
    const my = (mxy - mny) * 0.28;
    refFrameCache = {
        cx: (mnx + mxx) / 2,
        cy: (mny + mxy) / 2,
        w: mxx - mnx + 2 * mx,
        h: mxy - mny + 2 * my,
    };
    return refFrameCache;
}

function el(tag: string, attrs: Record<string, string | number | null>, text?: string): SVGElement {
    const node = document.createElementNS(SVGNS, tag) as SVGElement;
    for (const k in attrs) {
        const v = attrs[k];
        if (v != null) node.setAttribute(k, String(v));
    }
    if (text != null) node.textContent = text;
    return node;
}

/** Build and return the SVG element for the current state. */
export function buildTileSVG(state: RenderState): SVGElement {
    const { a, b } = state;
    const transform = state.transform ?? IDENTITY_TRANSFORM;
    const tile = createSmithTile(a, b, transform);
    const localVertices = tile.definition.shape.vertices; // untransformed — for polykite math
    const V = smithTileWorldVertices(tile); // world space — for drawing
    const showDec = state.showPolykite && polykiteValid(a, b);

    // Camera: fixed window (Hat extent) scaled only by zoom.
    const rf = refFrame();
    const sc = Math.min((W - 2 * PAD) / rf.w, (H - 2 * PAD) / rf.h) * state.zoom;
    const project = (p: Vec2): [number, number] => [
        (p.x - rf.cx) * sc + W / 2,
        -(p.y - rf.cy) * sc + H / 2,
    ];
    const pathD = (pts: Vec2[]) =>
        `${pts
            .map((p, i) => {
                const [x, y] = project(p);
                return `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
            })
            .join(' ')} Z`;

    const svg = el('svg', {
        viewBox: `0 0 ${W} ${H}`,
        preserveAspectRatio: 'xMidYMid meet',
        style: 'width:100%;height:100%;display:block;',
    });
    const add = (
        parent: SVGElement,
        tag: string,
        attrs: Record<string, string | number | null>,
        text?: string,
    ) => {
        const node = el(tag, attrs, text);
        parent.appendChild(node);
        return node;
    };

    // 1. reference grid (drawn in the same transformed frame as the tile)
    if (state.showGrid) {
        const g = add(svg, 'g', { opacity: 0.9 });
        const grid = transformedGridKites(transform);
        for (const kite of grid) {
            add(g, 'path', {
                d: pathD(kite),
                fill: 'none',
                stroke: COLOR.gridLine,
                'stroke-width': 1,
                'vector-effect': 'non-scaling-stroke',
            });
        }
        for (const kite of grid) {
            const [cx, cy] = project(kite[0]);
            add(g, 'circle', { cx, cy, r: 1.6, fill: COLOR.gridDot });
        }
    }

    // 2. exact polykite decomposition (membership is computed in local space,
    //    then each kite is transformed to match the drawn tile)
    if (showDec) {
        const g = add(svg, 'g', {});
        kitesInside(localVertices).forEach((kite, i) => {
            add(g, 'path', {
                d: pathD(transformKite(kite, transform)),
                fill: i % 2 ? 'rgba(89,128,166,0.20)' : 'rgba(65,97,128,0.30)',
                stroke: COLOR.kiteStroke,
                'stroke-width': 1,
                'vector-effect': 'non-scaling-stroke',
            });
        });
    }

    // 3. tile fill (skipped when the decomposition provides the fill)
    if (!showDec) {
        add(svg, 'path', { d: pathD(V), fill: COLOR.fill, stroke: 'none' });
    }

    // 4. tile boundary  /  5. A-B edge distinction
    if (!state.showAB) {
        add(svg, 'path', {
            d: pathD(V),
            fill: 'none',
            stroke: COLOR.boundary,
            'stroke-width': 2.4,
            'stroke-linejoin': 'round',
            'vector-effect': 'non-scaling-stroke',
        });
    } else {
        const g = add(svg, 'g', {});
        for (let i = 0; i < EDGE_COUNT; i++) {
            const [x1, y1] = project(V[i]);
            const [x2, y2] = project(V[(i + 1) % EDGE_COUNT]);
            const isA = EDGE_TEMPLATE[i].kind === 'A';
            add(g, 'line', {
                x1,
                y1,
                x2,
                y2,
                stroke: isA ? COLOR.aEdge : COLOR.bEdge,
                'stroke-width': 2.8,
                'stroke-dasharray': isA ? null : '6 4',
                'stroke-linecap': 'round',
                'vector-effect': 'non-scaling-stroke',
            });
        }
    }

    // 6. direction vectors
    if (state.showVectors) {
        const g = add(svg, 'g', {});
        for (let i = 0; i < EDGE_COUNT; i++) {
            const [x1, y1] = project(V[i]);
            const [x2, y2] = project(V[(i + 1) % EDGE_COUNT]);
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const ang = Math.atan2(y2 - y1, x2 - x1);
            const L = 7;
            const ax = mx + Math.cos(ang) * 3;
            const ay = my + Math.sin(ang) * 3;
            add(g, 'polygon', {
                points: `${ax},${ay} ${ax - Math.cos(ang - 0.5) * L},${ay - Math.sin(ang - 0.5) * L} ${ax - Math.cos(ang + 0.5) * L},${ay - Math.sin(ang + 0.5) * L}`,
                fill: COLOR.vector,
            });
        }
    }

    // 7. edge-length labels (a / b)
    if (state.showLengths) {
        const g = add(svg, 'g', {});
        for (let i = 0; i < EDGE_COUNT; i++) {
            const [x1, y1] = project(V[i]);
            const [x2, y2] = project(V[(i + 1) % EDGE_COUNT]);
            const isA = EDGE_TEMPLATE[i].kind === 'A';
            const ang = Math.atan2(y2 - y1, x2 - x1);
            const nx = Math.sin(ang);
            const ny = -Math.cos(ang);
            const mx = (x1 + x2) / 2 + nx * 13;
            const my = (y1 + y2) / 2 + ny * 13;
            add(
                g,
                'text',
                {
                    x: mx,
                    y: my,
                    fill: isA ? COLOR.aEdge : COLOR.bEdge,
                    'font-size': 13,
                    'font-style': 'italic',
                    'font-family': 'Barlow, sans-serif',
                    'text-anchor': 'middle',
                    'dominant-baseline': 'middle',
                },
                isA ? 'a' : 'b',
            );
        }
    }

    // 8. vertex numbers, or plain dots
    if (state.showVertexNums) {
        const g = add(svg, 'g', {});
        for (let i = 0; i < EDGE_COUNT; i++) {
            const [x, y] = project(V[i]);
            add(g, 'circle', {
                cx: x,
                cy: y,
                r: 9,
                fill: COLOR.vertexFill,
                stroke: COLOR.vertexDot,
                'stroke-width': 1.4,
            });
            add(
                g,
                'text',
                {
                    x,
                    y: y + 0.5,
                    fill: COLOR.vertexDot,
                    'font-size': 10.5,
                    'font-family': 'Barlow Condensed, sans-serif',
                    'font-weight': 600,
                    'text-anchor': 'middle',
                    'dominant-baseline': 'middle',
                },
                String(i),
            );
        }
    } else {
        const g = add(svg, 'g', {});
        for (const p of V) {
            const [x, y] = project(p);
            add(g, 'circle', { cx: x, cy: y, r: 2.4, fill: COLOR.vertexDot });
        }
    }

    return svg;
}
