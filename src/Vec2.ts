export interface Vec2 {
    x: number;
    y: number;
}

export function addVec2(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x + b.x, y: a.y + b.y };
}

export function subVec2(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x - b.x, y: a.y - b.y };
}
