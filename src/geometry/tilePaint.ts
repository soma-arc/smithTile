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
