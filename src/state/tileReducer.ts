/**
 * UI state and transitions for the visualizer, as a pure reducer.
 * Ported 1:1 from the former imperative handlers in main.ts.
 */

import type { Lang } from '../i18n';
import type { SpectrePatchKey } from '../smithPatch';
import { type CurveSpec, DEFAULT_SPECTRE_CURVE, type Preset, SQRT3 } from '../smithTile';
import type { ArticulatedWormKey } from '../spectreWorm';
import type { Vec2 } from '../Vec2';

export type ParameterMode = 'ratio' | 'independent';
export type SpectreCurveMode = 'straight' | 'cubicBezier';
export type ShapeSelection =
    | { kind: 'tile' }
    | { kind: 'spectre'; patch: SpectrePatchKey | null }
    | { kind: 'articulatedWorm'; worm: ArticulatedWormKey };

/** Camera zoom bounds, shared by the slider and mouse-wheel zoom. */
export const ZOOM_MIN = 0.05;
export const ZOOM_MAX = 10;

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
    parameterMode: ParameterMode;
    shape: ShapeSelection;
    spectreCurve: CurveSpec;
    spectreCurveMode: SpectreCurveMode;
    a: number;
    b: number;
    /** Reflect Tile(a,b) across its local Y axis. Spectre mode does not use this. */
    mirrored: boolean;
    zoom: number;
    /** Screen-space translation in logical canvas units. */
    pan: Vec2;
    toggles: Toggles;
    presetName: string; // includes the sentinel 'custom'
    /** Whole-scene rotation in degrees (view control, like zoom). */
    rotationDeg: number;
};

export const initialTileState: TileState = {
    lang: 'ja',
    parameterMode: 'ratio', // implementation policy §6: prioritize ratio mode initially
    shape: { kind: 'tile' },
    spectreCurve: DEFAULT_SPECTRE_CURVE,
    spectreCurveMode: 'cubicBezier',
    a: 1,
    b: SQRT3, // Hat
    mirrored: false,
    zoom: 1,
    pan: { x: 0, y: 0 },
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
};

export type TileAction =
    | { type: 'setLang'; lang: Lang }
    | { type: 'setParameterMode'; mode: ParameterMode }
    | { type: 'setShape'; shape: ShapeSelection['kind'] }
    | { type: 'setSpectrePatch'; patch: SpectrePatchKey | null }
    | { type: 'setArticulatedWorm'; worm: ArticulatedWormKey }
    | { type: 'setSpectreControlPoint'; point: 'c1' | 'c2'; value: Vec2 }
    | { type: 'setSpectreCurveMode'; mode: SpectreCurveMode }
    | { type: 'resetSpectreCurve' }
    | { type: 'setA'; value: number }
    | { type: 'setB'; value: number }
    | { type: 'setRatio'; ratio: number }
    | { type: 'setMirrored'; mirrored: boolean }
    | { type: 'setZoom'; zoom: number }
    | { type: 'panBy'; delta: Vec2 }
    | { type: 'setRotation'; deg: number }
    | { type: 'applyPreset'; preset: Preset }
    | { type: 'toggle'; key: keyof Toggles };

/** Apply partial state and mark the Tile parameters as custom (non-preset). */
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

        case 'setParameterMode':
            if (action.mode === 'ratio') {
                // Collapse to a = 1, keeping the current ratio.
                const ratio = state.a > 0 ? state.b / state.a : state.b;
                return custom(state, { parameterMode: 'ratio', a: 1, b: ratio });
            }
            return custom(state, { parameterMode: 'independent' });

        case 'setShape':
            return {
                ...state,
                pan: { x: 0, y: 0 },
                shape:
                    action.shape === 'spectre'
                        ? { kind: 'spectre', patch: null }
                        : action.shape === 'articulatedWorm'
                          ? { kind: 'articulatedWorm', worm: 'E' }
                          : { kind: 'tile' },
            };

        case 'setSpectrePatch':
            return {
                ...state,
                pan: { x: 0, y: 0 },
                shape: { kind: 'spectre', patch: action.patch },
            };

        case 'setArticulatedWorm':
            return {
                ...state,
                pan: { x: 0, y: 0 },
                shape: { kind: 'articulatedWorm', worm: action.worm },
            };

        case 'setSpectreControlPoint':
            if (state.spectreCurve.kind !== 'cubicBezier') return state;
            return {
                ...state,
                spectreCurve: {
                    ...state.spectreCurve,
                    [action.point]: action.value,
                },
            };

        case 'setSpectreCurveMode':
            return { ...state, spectreCurveMode: action.mode };

        case 'resetSpectreCurve':
            return { ...state, spectreCurve: DEFAULT_SPECTRE_CURVE };

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

        case 'setMirrored':
            return { ...state, mirrored: action.mirrored };

        case 'setZoom':
            return { ...state, zoom: clampZoom(action.zoom) };

        case 'panBy':
            return {
                ...state,
                pan: {
                    x: state.pan.x + (Number.isFinite(action.delta.x) ? action.delta.x : 0),
                    y: state.pan.y + (Number.isFinite(action.delta.y) ? action.delta.y : 0),
                },
            };

        case 'setRotation':
            return { ...state, rotationDeg: action.deg };

        case 'applyPreset': {
            const p = action.preset;
            return {
                ...state,
                a: p.a,
                b: p.b,
                shape: { kind: 'tile' },
                pan: { x: 0, y: 0 },
                presetName: p.key,
                // Chevron (a = 0) has no finite ratio; force independent mode.
                parameterMode: p.a === 0 ? 'independent' : state.parameterMode,
            };
        }

        case 'toggle':
            return {
                ...state,
                toggles: { ...state.toggles, [action.key]: !state.toggles[action.key] },
            };
    }
}
