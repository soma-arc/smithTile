/**
 * Canvas backend — renders the same Scene onto a 2D <canvas>.
 *
 * Demonstrates that the Scene contract is backend-agnostic: this consumes the
 * identical `Drawable` list the SVG backend does. Not the default; opt-in via
 * `<TileView backend="canvas">`.
 */

import { useEffect, useRef } from 'react';
import { assertNever } from '../exhaustive';
import type { BackendProps, Drawable, Style } from '../scene';

function drawOne(ctx: CanvasRenderingContext2D, d: Drawable): void {
    switch (d.kind) {
        case 'polygon': {
            if (d.points.length === 0) return;
            ctx.beginPath();
            ctx.moveTo(d.points[0].x, d.points[0].y);
            for (let i = 1; i < d.points.length; i++) ctx.lineTo(d.points[i].x, d.points[i].y);
            ctx.closePath();
            paint(ctx, d.style);
            break;
        }
        case 'path': {
            const first = d.segments[0];
            if (!first) return;
            const start = first.kind === 'polyline' ? first.points[0] : first.p0;
            if (!start) return;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            for (const segment of d.segments) {
                switch (segment.kind) {
                    case 'line':
                        ctx.lineTo(segment.p1.x, segment.p1.y);
                        break;
                    case 'cubicBezier':
                        ctx.bezierCurveTo(
                            segment.c1.x,
                            segment.c1.y,
                            segment.c2.x,
                            segment.c2.y,
                            segment.p1.x,
                            segment.p1.y,
                        );
                        break;
                    case 'polyline':
                        for (const point of segment.points.slice(1)) {
                            ctx.lineTo(point.x, point.y);
                        }
                        break;
                }
            }
            if (d.closed) ctx.closePath();
            paint(ctx, d.style);
            break;
        }
        case 'segment': {
            ctx.beginPath();
            ctx.moveTo(d.a.x, d.a.y);
            ctx.lineTo(d.b.x, d.b.y);
            paint(ctx, d.style, true);
            break;
        }
        case 'circle': {
            ctx.beginPath();
            ctx.arc(d.center.x, d.center.y, d.r, 0, Math.PI * 2);
            paint(ctx, d.style);
            break;
        }
        case 'text': {
            const s = d.style;
            ctx.fillStyle = s.fill;
            ctx.font = `${s.italic ? 'italic ' : ''}${s.weight ?? 400} ${s.size}px ${s.family ?? 'sans-serif'}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(d.text, d.at.x, d.at.y);
            break;
        }
        default:
            assertNever(d);
    }
}

function paint(ctx: CanvasRenderingContext2D, style: Style, strokeOnly = false): void {
    if (!strokeOnly && style.fill && style.fill !== 'none') {
        ctx.globalAlpha = style.opacity ?? 1;
        ctx.fillStyle = style.fill;
        ctx.fill();
    }
    if (style.stroke) {
        ctx.globalAlpha = style.opacity ?? 1;
        ctx.strokeStyle = style.stroke;
        ctx.lineWidth = style.width ?? 1;
        ctx.lineCap = style.cap ?? 'butt';
        ctx.lineJoin = style.join ?? 'miter';
        ctx.setLineDash(style.dash ? style.dash.split(/\s+/).map(Number) : []);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
}

export function CanvasBackend({ scene }: BackendProps) {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const [, , w, h] = scene.viewBox;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        for (const layer of scene.layers) {
            ctx.globalAlpha = layer.id === 'grid' ? 0.9 : 1;
            for (const item of layer.items) drawOne(ctx, item);
        }
        ctx.globalAlpha = 1;
    }, [scene]);

    // object-fit: contain reproduces the SVG's xMidYMid meet letterboxing.
    return (
        <canvas
            ref={ref}
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
        />
    );
}
