/**
 * UI state and transitions for the visualizer, as a pure reducer.
 * Ported 1:1 from the former imperative handlers in main.ts.
 */

import type { SpectrePatchKey } from '../geometry/smithPatch';
import {
    type CubicBezierCurve,
    DEFAULT_SPECTRE_CURVE,
    DEFAULT_SPECTRE_POLYLINE,
    type PolylineCurve,
    type Preset,
    SQRT3,
} from '../geometry/smithTile';
import type { SpectreRegionKey } from '../geometry/spectreRegion';
import type { ArticulatedWormKey } from '../geometry/spectreWorm';
import type { Vec2 } from '../geometry/Vec2';
import {
    erasePaintStrokes,
    type PaintDocument,
    type PaintPoint,
    type PaintStroke,
    type PaintTool,
} from '../geometry/tilePaint';
import type { Lang } from '../i18n';

export type ParameterMode = 'ratio' | 'independent';
export type SpectreCurveMode = 'straight' | 'cubicBezier' | 'polyline';
export type AssemblyTileMode = 'hatTurtle' | 'spectre';
export type RegionPlacementMode = 'auto' | 'manual';
export type RegionAdjustment = { translation: Vec2; rotationRad: number };
export type ShapeSelection =
    | { kind: 'tile' }
    | { kind: 'spectre'; patch: SpectrePatchKey | null }
    | { kind: 'articulatedWorm'; worm: ArticulatedWormKey }
    | { kind: 'region'; region: SpectreRegionKey };

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
    showWormEnds: boolean;
};

export type TileState = {
    lang: Lang;
    parameterMode: ParameterMode;
    shape: ShapeSelection;
    spectreCurve: CubicBezierCurve;
    spectrePolyline: PolylineCurve;
    spectreCurveMode: SpectreCurveMode;
    paint: PaintDocument;
    paintHistory: readonly (readonly PaintStroke[])[];
    paintTool: PaintTool;
    paintColor: string;
    paintWidth: number;
    paintEraserWidth: number;
    tileColor: string;
    assemblyTileMode: AssemblyTileMode;
    a: number;
    b: number;
    /** Reflect source tiles before constructing Tile(a,b), worms, or regions. */
    mirrored: boolean;
    zoom: number;
    /** Screen-space translation in logical canvas units. */
    pan: Vec2;
    regionPlacementMode: RegionPlacementMode;
    regionAdjustments: Readonly<Record<number, RegionAdjustment>>;
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
    spectrePolyline: DEFAULT_SPECTRE_POLYLINE,
    spectreCurveMode: 'cubicBezier',
    paint: { strokes: [], visible: true },
    paintHistory: [],
    paintTool: 'brush',
    paintColor: '#d9485f',
    paintWidth: 0.025,
    paintEraserWidth: 0.08,
    tileColor: '#dfe5eb',
    assemblyTileMode: 'hatTurtle',
    a: 1,
    b: SQRT3, // Hat
    mirrored: false,
    zoom: 1,
    pan: { x: 0, y: 0 },
    regionPlacementMode: 'auto',
    regionAdjustments: {},
    toggles: {
        showGrid: false,
        showPolykite: false,
        showAB: false,
        showVectors: false,
        showVertexNums: false,
        showVertexDots: false,
        showLengths: false,
        showAngles: false,
        showPorts: false,
        showPatchPorts: true,
        showComponentColors: true,
        showComponentBorders: false,
        showWormEnds: true,
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
    | { type: 'setSpectreRegion'; region: SpectreRegionKey }
    | { type: 'setRegionPlacementMode'; mode: RegionPlacementMode }
    | { type: 'moveRegionWorm'; wormIndex: number; delta: Vec2 }
    | { type: 'rotateRegionWorm'; wormIndex: number; deltaRad: number }
    | { type: 'resetRegionPlacement' }
    | { type: 'setSpectreControlPoint'; point: 'c1' | 'c2'; value: Vec2 }
    | { type: 'addSpectrePolylinePoint'; segmentIndex: number; value: Vec2 }
    | { type: 'moveSpectrePolylinePoint'; pointIndex: number; value: Vec2 }
    | { type: 'removeSpectrePolylinePoint'; pointIndex: number }
    | { type: 'setSpectreCurveMode'; mode: SpectreCurveMode }
    | { type: 'setAssemblyTileMode'; mode: AssemblyTileMode }
    | { type: 'resetSpectreCurve' }
    | { type: 'addPaintStroke'; stroke: PaintStroke }
    | { type: 'erasePaintPath'; points: readonly PaintPoint[]; width: number }
    | { type: 'undoPaintStroke' }
    | { type: 'clearPaint' }
    | { type: 'setPaintVisible'; visible: boolean }
    | { type: 'setPaintColor'; color: string }
    | { type: 'setPaintWidth'; width: number }
    | { type: 'setPaintEraserWidth'; width: number }
    | { type: 'setPaintTool'; tool: PaintTool }
    | { type: 'setTileColor'; color: string }
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

function appendPaintHistory(state: TileState): readonly (readonly PaintStroke[])[] {
    return [...state.paintHistory.slice(-49), state.paint.strokes];
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
                          : action.shape === 'region'
                            ? { kind: 'region', region: 'PA1' }
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

        case 'setSpectreRegion':
            return {
                ...state,
                pan: { x: 0, y: 0 },
                shape: { kind: 'region', region: action.region },
                regionPlacementMode:
                    action.region.startsWith('TA') ||
                    action.region.startsWith('TC') ||
                    action.region.startsWith('PB') ||
                    action.region.startsWith('TB') ||
                    action.region.startsWith('TD') ||
                    action.region.includes('-')
                        ? 'manual'
                        : state.regionPlacementMode,
                regionAdjustments: {},
            };

        case 'setRegionPlacementMode':
            return { ...state, regionPlacementMode: action.mode };

        case 'moveRegionWorm': {
            const current = state.regionAdjustments[action.wormIndex] ?? {
                translation: { x: 0, y: 0 },
                rotationRad: 0,
            };
            return {
                ...state,
                regionAdjustments: {
                    ...state.regionAdjustments,
                    [action.wormIndex]: {
                        ...current,
                        translation: {
                            x: current.translation.x + action.delta.x,
                            y: current.translation.y + action.delta.y,
                        },
                    },
                },
            };
        }

        case 'rotateRegionWorm': {
            const current = state.regionAdjustments[action.wormIndex] ?? {
                translation: { x: 0, y: 0 },
                rotationRad: 0,
            };
            return {
                ...state,
                regionAdjustments: {
                    ...state.regionAdjustments,
                    [action.wormIndex]: {
                        ...current,
                        rotationRad: current.rotationRad + action.deltaRad,
                    },
                },
            };
        }

        case 'resetRegionPlacement':
            return {
                ...state,
                regionAdjustments: {},
            };

        case 'setSpectreControlPoint':
            return {
                ...state,
                spectreCurve: {
                    ...state.spectreCurve,
                    [action.point]: action.value,
                },
            };

        case 'addSpectrePolylinePoint': {
            const points = state.spectrePolyline.points;
            if (action.segmentIndex < 0 || action.segmentIndex >= points.length - 1) return state;
            return {
                ...state,
                spectrePolyline: {
                    kind: 'polyline',
                    points: [
                        ...points.slice(0, action.segmentIndex + 1),
                        action.value,
                        ...points.slice(action.segmentIndex + 1),
                    ],
                },
            };
        }

        case 'moveSpectrePolylinePoint': {
            const points = state.spectrePolyline.points;
            if (action.pointIndex <= 0 || action.pointIndex >= points.length - 1) return state;
            return {
                ...state,
                spectrePolyline: {
                    kind: 'polyline',
                    points: points.map((point, index) =>
                        index === action.pointIndex ? action.value : point,
                    ),
                },
            };
        }

        case 'removeSpectrePolylinePoint': {
            const points = state.spectrePolyline.points;
            if (action.pointIndex <= 0 || action.pointIndex >= points.length - 1) return state;
            return {
                ...state,
                spectrePolyline: {
                    kind: 'polyline',
                    points: points.filter((_, index) => index !== action.pointIndex),
                },
            };
        }

        case 'setSpectreCurveMode':
            return { ...state, spectreCurveMode: action.mode };

        case 'setAssemblyTileMode':
            return {
                ...state,
                assemblyTileMode: action.mode,
                pan: { x: 0, y: 0 },
                regionAdjustments: {},
            };

        case 'resetSpectreCurve':
            return state.spectreCurveMode === 'polyline'
                ? { ...state, spectrePolyline: DEFAULT_SPECTRE_POLYLINE }
                : { ...state, spectreCurve: DEFAULT_SPECTRE_CURVE };

        case 'addPaintStroke':
            if (action.stroke.points.length < 2) return state;
            return {
                ...state,
                paintHistory: appendPaintHistory(state),
                paint: { ...state.paint, strokes: [...state.paint.strokes, action.stroke] },
            };

        case 'erasePaintPath': {
            const strokes = erasePaintStrokes(state.paint.strokes, action.points, action.width / 2);
            if (
                strokes.length === state.paint.strokes.length &&
                strokes.every((stroke, index) => stroke === state.paint.strokes[index])
            ) {
                return state;
            }
            return {
                ...state,
                paintHistory: appendPaintHistory(state),
                paint: { ...state.paint, strokes },
            };
        }

        case 'undoPaintStroke': {
            const previous = state.paintHistory[state.paintHistory.length - 1];
            if (!previous) return state;
            return {
                ...state,
                paintHistory: state.paintHistory.slice(0, -1),
                paint: { ...state.paint, strokes: previous },
            };
        }

        case 'clearPaint':
            return state.paint.strokes.length === 0
                ? state
                : {
                      ...state,
                      paintHistory: appendPaintHistory(state),
                      paint: { ...state.paint, strokes: [] },
                  };

        case 'setPaintVisible':
            return { ...state, paint: { ...state.paint, visible: action.visible } };

        case 'setPaintColor':
            return { ...state, paintColor: action.color };

        case 'setPaintWidth':
            return {
                ...state,
                paintWidth: Math.max(0.005, Math.min(0.12, action.width)),
            };

        case 'setPaintEraserWidth':
            return {
                ...state,
                paintEraserWidth: Math.max(0.01, Math.min(0.25, action.width)),
            };

        case 'setPaintTool':
            return { ...state, paintTool: action.tool };

        case 'setTileColor':
            return { ...state, tileColor: action.color };

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
