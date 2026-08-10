/** SVG backend — renders a Scene as declarative JSX. */

import type { Vec2 } from '../../Vec2';
import { assertNever } from '../exhaustive';
import type { BackendProps, Drawable } from '../scene';

function pointsAttr(points: readonly Vec2[]): string {
    return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

function DrawableEl({ d }: { d: Drawable }) {
    switch (d.kind) {
        case 'polygon': {
            const s = d.style;
            return (
                <polygon
                    points={pointsAttr(d.points)}
                    fill={s.fill ?? 'none'}
                    stroke={s.stroke}
                    strokeWidth={s.width}
                    strokeDasharray={s.dash}
                    strokeLinecap={s.cap}
                    strokeLinejoin={s.join}
                    opacity={s.opacity}
                    // SVG-specific: keep stroke width constant under viewBox scaling.
                    vectorEffect={s.stroke ? 'non-scaling-stroke' : undefined}
                />
            );
        }
        case 'segment': {
            const s = d.style;
            return (
                <line
                    x1={d.a.x}
                    y1={d.a.y}
                    x2={d.b.x}
                    y2={d.b.y}
                    stroke={s.stroke}
                    strokeWidth={s.width}
                    strokeDasharray={s.dash}
                    strokeLinecap={s.cap}
                    strokeLinejoin={s.join}
                    opacity={s.opacity}
                    vectorEffect={s.stroke ? 'non-scaling-stroke' : undefined}
                />
            );
        }
        case 'circle': {
            const s = d.style;
            return (
                <circle
                    cx={d.center.x}
                    cy={d.center.y}
                    r={d.r}
                    fill={s.fill ?? 'none'}
                    stroke={s.stroke}
                    strokeWidth={s.width}
                    opacity={s.opacity}
                    vectorEffect={s.stroke ? 'non-scaling-stroke' : undefined}
                />
            );
        }
        case 'text': {
            const s = d.style;
            return (
                <text
                    x={d.at.x}
                    y={d.at.y}
                    fill={s.fill}
                    fontSize={s.size}
                    fontStyle={s.italic ? 'italic' : undefined}
                    fontWeight={s.weight}
                    fontFamily={s.family}
                    textAnchor="middle"
                    dominantBaseline="middle"
                >
                    {d.text}
                </text>
            );
        }
        default:
            return assertNever(d);
    }
}

export function SvgBackend({ scene }: BackendProps) {
    const [minX, minY, w, h] = scene.viewBox;
    return (
        <svg
            viewBox={`${minX} ${minY} ${w} ${h}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: '100%', display: 'block' }}
            role="img"
        >
            <title>Tile(a, b)</title>
            {scene.layers.map((layer) => (
                <g key={layer.id} opacity={layer.id === 'grid' ? 0.9 : undefined}>
                    {layer.items.map((d, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: scene items are positional and rebuilt wholesale
                        <DrawableEl key={i} d={d} />
                    ))}
                </g>
            ))}
        </svg>
    );
}
