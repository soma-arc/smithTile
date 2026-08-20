/**
 * UI state and transitions for the visualizer, as a pure reducer.
 * Ported 1:1 from the former imperative handlers in main.ts.
 */

import type { Lang } from '../i18n';
import type { PatchKey } from '../smithPatch';
import { type Preset, SQRT3 } from '../smithTile';

export type Mode = 'ratio' | 'independent' | 'spectre';

/** Camera zoom bounds, shared by the slider and mouse-wheel zoom. */
export const ZOOM_MIN = 0.35;
export const ZOOM_MAX = 3;

/** Clamp a zoom factor into the allowed range. */
export function clampZoom(z: number): number {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

export type Toggles = {
    showGrid: boolean;
    showPolykite: boolean;
    showAB: boolean;
    showVectors: boolean;
    showVertexNums: boolean;
    showVertexDots: boolean;
    showLengths: boolean;
    showAngles: boolean;
    showPorts: boolean;
    showPatchPorts: boolean;
    showComponentColors: boolean;
    showComponentBorders: boolean;
};

export type TileState = {
    lang: Lang;
    mode: Mode;
    a: number;
    b: number;
    zoom: number;
    toggles: Toggles;
    presetName: string; // includes the sentinel 'custom'
    /** Whole-scene rotation in degrees (view control, like zoom). */
    rotationDeg: number;
    /** Selected prebuilt patch, or null for the interactive Tile(a, b). */
    patch: PatchKey | null;
};

export const initialTileState: TileState = {
    lang: 'ja',
    mode: 'ratio', // implementation policy §6: prioritize ratio mode initially
    a: 1,
    b: SQRT3, // Hat
    zoom: 1,
    toggles: {
        showGrid: false,
        showPolykite: false,
        showAB: false,
        showVectors: false,
        showVertexNums: false,
        showVertexDots: true,
        showLengths: false,
        showAngles: false,
        showPorts: false,
        showPatchPorts: true,
        showComponentColors: true,
        showComponentBorders: true,
    },
    presetName: 'hat',
    rotationDeg: 0,
    patch: null,
};

export type TileAction =
    | { type: 'setLang'; lang: Lang }
    | { type: 'setMode'; mode: Mode }
    | { type: 'setA'; value: number }
    | { type: 'setB'; value: number }
    | { type: 'setRatio'; ratio: number }
    | { type: 'setZoom'; zoom: number }
    | { type: 'setRotation'; deg: number }
    | { type: 'setPatch'; patch: PatchKey | null }
    | { type: 'applyPreset'; preset: Preset }
    | { type: 'toggle'; key: keyof Toggles };

/** Apply a patch and mark the current shape as a custom (non-preset) one. */
function custom(state: TileState, patch: Partial<TileState>): TileState {
    return { ...state, ...patch, presetName: 'custom' };
}

function nonNegative(value: number): number {
    return Math.max(0, Number.isFinite(value) ? value : 0);
}

export function tileReducer(state: TileState, action: TileAction): TileState {
    switch (action.type) {
        case 'setLang':
            return { ...state, lang: action.lang };

        case 'setMode':
            if (action.mode === 'spectre') {
                return custom(state, { mode: 'spectre', a: 1, b: 1 });
            }
            if (action.mode === 'ratio') {
                // Collapse to a = 1, keeping the current ratio.
                const ratio = state.a > 0 ? state.b / state.a : state.b;
                return custom(state, { mode: 'ratio', a: 1, b: ratio });
            }
            return custom(state, { mode: 'independent' });

        case 'setA': {
            const v = nonNegative(action.value);
            if (v === 0 && state.b === 0) return state;
            return custom(state, { a: v });
        }

        case 'setB': {
            const v = nonNegative(action.value);
            if (v === 0 && state.a === 0) return state;
            return custom(state, { b: v });
        }

        case 'setRatio':
            return custom(state, { a: 1, b: nonNegative(action.ratio) });

        case 'setZoom':
            return { ...state, zoom: clampZoom(action.zoom) };

        case 'setRotation':
            return { ...state, rotationDeg: action.deg };

        case 'setPatch':
            return { ...state, patch: action.patch };

        case 'applyPreset': {
            const p = action.preset;
            return {
                ...state,
                a: p.a,
                b: p.b,
                presetName: p.key,
                // Chevron (a = 0) has no finite ratio; force independent mode.
                mode: p.a === 0 ? 'independent' : state.mode === 'spectre' ? 'ratio' : state.mode,
            };
        }

        case 'toggle':
            return {
                ...state,
                toggles: { ...state.toggles, [action.key]: !state.toggles[action.key] },
            };
    }
}
