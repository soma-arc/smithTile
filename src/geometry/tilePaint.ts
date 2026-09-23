import type { Vec2 } from './Vec2';

/** A point in a normalized square centered on the tile: (0,0) bottom-left, (1,1) top-right. */
export type PaintPoint = Vec2 & {
    /** Normalized stylus pressure. Absent points are rendered at full pressure. */
    pressure?: number;
};

export type PaintStroke = {
    points: readonly PaintPoint[];
    color: string;
    /** Brush width relative to the square paint frame containing the tile. */
    width: number;
    opacity: number;
};

export type PaintTool = 'brush' | 'eraser';

export type PaintDocument = {
    strokes: readonly PaintStroke[];
    visible: boolean;
};

export type Bounds2 = {
    minX: number;
    minY: number;
    width: number;
    height: number;
};

export function pointsBounds(points: readonly Vec2[]): Bounds2 {
    if (points.length === 0) throw new RangeError('pointsBounds requires at least one point');
    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;
    for (const point of points.slice(1)) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
    }
    return { minX, minY, width: maxX - minX, height: maxY - minY };
}

/** Side length of the square paint frame containing the tile without distortion. */
export function paintFrameSize(bounds: Bounds2): number {
    return Math.max(bounds.width, bounds.height);
}

/** Keep light pen contact visible while still providing a useful pressure range. */
export function paintPressureScale(pressure: number | undefined): number {
    const normalized =
        pressure === undefined || !Number.isFinite(pressure)
            ? 1
            : Math.max(0, Math.min(1, pressure));
    return 0.25 + normalized * 0.75;
}

export function paintPointToLocal(point: PaintPoint, bounds: Bounds2): Vec2 {
    const size = paintFrameSize(bounds);
    const centerX = bounds.minX + bounds.width / 2;
    const centerY = bounds.minY + bounds.height / 2;
    return {
        x: centerX + (point.x - 0.5) * size,
        y: centerY + (point.y - 0.5) * size,
    };
}

export function localPointToPaint(point: Vec2, bounds: Bounds2): PaintPoint {
    const size = paintFrameSize(bounds);
    const centerX = bounds.minX + bounds.width / 2;
    const centerY = bounds.minY + bounds.height / 2;
    return {
        x: size === 0 ? 0.5 : 0.5 + (point.x - centerX) / size,
        y: size === 0 ? 0.5 : 0.5 + (point.y - centerY) / size,
    };
}

function distanceToSegment(point: Vec2, start: Vec2, end: Vec2): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
    const amount = Math.max(
        0,
        Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
    );
    return Math.hypot(point.x - (start.x + amount * dx), point.y - (start.y + amount * dy));
}

function distanceToPath(point: Vec2, path: readonly PaintPoint[]): number {
    if (path.length === 0) return Number.POSITIVE_INFINITY;
    if (path.length === 1) return Math.hypot(point.x - path[0].x, point.y - path[0].y);
    let distance = Number.POSITIVE_INFINITY;
    for (let i = 1; i < path.length; i++) {
        distance = Math.min(distance, distanceToSegment(point, path[i - 1], path[i]));
    }
    return distance;
}

function densifyStroke(points: readonly PaintPoint[], spacing: number): PaintPoint[] {
    const dense: PaintPoint[] = points.length > 0 ? [points[0]] : [];
    for (let i = 1; i < points.length; i++) {
        const start = points[i - 1];
        const end = points[i];
        const length = Math.hypot(end.x - start.x, end.y - start.y);
        const steps = Math.max(1, Math.ceil(length / spacing));
        for (let step = 1; step <= steps; step++) {
            const amount = step / steps;
            const startPressure = start.pressure ?? 1;
            const endPressure = end.pressure ?? 1;
            dense.push({
                x: start.x + (end.x - start.x) * amount,
                y: start.y + (end.y - start.y) * amount,
                pressure: startPressure + (endPressure - startPressure) * amount,
            });
        }
    }
    return dense;
}

/** Remove portions of vector strokes covered by a normalized eraser path. */
export function erasePaintStrokes(
    strokes: readonly PaintStroke[],
    eraserPath: readonly PaintPoint[],
    eraserRadius: number,
): PaintStroke[] {
    if (eraserPath.length === 0 || !(eraserRadius > 0)) return [...strokes];
    const result: PaintStroke[] = [];
    for (const stroke of strokes) {
        const effectiveRadius = eraserRadius + stroke.width / 2;
        const dense = densifyStroke(stroke.points, Math.max(0.002, effectiveRadius / 4));
        const erased = dense.map((point) => distanceToPath(point, eraserPath) <= effectiveRadius);
        if (!erased.some(Boolean)) {
            result.push(stroke);
            continue;
        }

        let fragment: PaintPoint[] = [];
        const commitFragment = () => {
            if (fragment.length >= 2) result.push({ ...stroke, points: fragment });
            fragment = [];
        };
        for (let i = 0; i < dense.length; i++) {
            if (erased[i]) commitFragment();
            else fragment.push(dense[i]);
        }
        commitFragment();
    }
    return result;
}
