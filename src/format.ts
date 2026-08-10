/** Number formatting helpers for the UI. */

import { SQRT3 } from './smithTile';

/** Compact numeric formatting: integers stay whole, otherwise up to 4 dp. */
export function fmtNum(x: number): string {
    return Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : String(+x.toFixed(4));
}

/**
 * Pretty math formatting for on-screen lengths — recognizes the √3 family used
 * by Hat/Turtle so labels read `√3` instead of `1.732`.
 */
export function fmtMath(x: number): string {
    if (Math.abs(x - SQRT3) < 1e-6) return '√3';
    if (Math.abs(x - 2 * SQRT3) < 1e-6) return '2√3';
    if (Number.isInteger(x)) return String(x);
    return x.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}
