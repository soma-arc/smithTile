import { SPECTRE_PATCHES } from '../geometry/smithPatch';
import { MAX_SPECTRE_WRIGGLY_LEVEL, SPECTRE_WRIGGLY_KINDS } from '../geometry/spectreWrigglyPatch';
import { MAX_TILE_PATCH_LEVEL, TILE_PATCH_KINDS } from '../geometry/tileArticulatedPatch';
import { MAX_TILE_WRIGGLY_LEVEL } from '../geometry/tileWrigglyPatch';
import type {
    ExportableShapeSelection,
    SavedPatchParameters,
    TileState,
} from '../state/tileReducer';
import type { PatchTrayOptions } from './patchTray';

export const EXPORT_PROFILE_STORAGE_KEY = 'smithTile.exportProfile.v1';
export const EXPORT_PROFILE_FILENAME = 'smith-tile-export-profile.json';

export type Export3dSettings = {
    unitMm: number;
    thickness: number;
    bevel: number;
    curveToleranceMm: number;
} & PatchTrayOptions;

export type ExportProfile = {
    version: 1;
    savedAt: string;
    patch: SavedPatchParameters;
    export3d: Export3dSettings;
};

function record(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new RangeError('Expected an object');
    }
    return value as Record<string, unknown>;
}

function finite(value: unknown, name: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new RangeError(`${name} must be finite`);
    }
    return value;
}

function point(value: unknown, name: string) {
    const candidate = record(value);
    return { x: finite(candidate.x, `${name}.x`), y: finite(candidate.y, `${name}.y`) };
}

function shape(value: unknown): ExportableShapeSelection {
    const candidate = record(value);
    switch (candidate.kind) {
        case 'tile':
            return { kind: 'tile' };
        case 'spectre': {
            const patch = candidate.patch;
            if (
                patch !== null &&
                (typeof patch !== 'string' || !Object.keys(SPECTRE_PATCHES).includes(patch))
            ) {
                throw new RangeError('Unknown Spectre patch');
            }
            return { kind: 'spectre', patch: patch as keyof typeof SPECTRE_PATCHES | null };
        }
        case 'spectreWriggly': {
            const patch = candidate.patch;
            const level = finite(candidate.level, 'shape.level');
            if (
                typeof patch !== 'string' ||
                !SPECTRE_WRIGGLY_KINDS.includes(patch as (typeof SPECTRE_WRIGGLY_KINDS)[number]) ||
                !Number.isInteger(level) ||
                level < 0 ||
                level > MAX_SPECTRE_WRIGGLY_LEVEL
            ) {
                throw new RangeError('Invalid Spectre Wriggly patch');
            }
            return {
                kind: 'spectreWriggly',
                patch: patch as (typeof SPECTRE_WRIGGLY_KINDS)[number],
                level,
            };
        }
        case 'articulatedPatch':
        case 'wrigglyPatch': {
            const patch = candidate.patch;
            const level = finite(candidate.level, 'shape.level');
            const maxLevel =
                candidate.kind === 'wrigglyPatch' ? MAX_TILE_WRIGGLY_LEVEL : MAX_TILE_PATCH_LEVEL;
            if (
                typeof patch !== 'string' ||
                !TILE_PATCH_KINDS.includes(patch as (typeof TILE_PATCH_KINDS)[number]) ||
                !Number.isInteger(level) ||
                level < 0 ||
                level > maxLevel
            ) {
                throw new RangeError('Invalid Tile patch');
            }
            return {
                kind: candidate.kind,
                patch: patch as (typeof TILE_PATCH_KINDS)[number],
                level,
            };
        }
        default:
            throw new RangeError('Unsupported shape');
    }
}

function patchParameters(value: unknown): SavedPatchParameters {
    const candidate = record(value);
    const a = finite(candidate.a, 'patch.a');
    const b = finite(candidate.b, 'patch.b');
    if (a < 0 || b < 0 || (a === 0 && b === 0)) throw new RangeError('Invalid Tile parameters');
    if (candidate.parameterMode !== 'ratio' && candidate.parameterMode !== 'independent') {
        throw new RangeError('Invalid parameter mode');
    }
    if (
        candidate.spectreCurveMode !== 'straight' &&
        candidate.spectreCurveMode !== 'cubicBezier' &&
        candidate.spectreCurveMode !== 'polyline'
    ) {
        throw new RangeError('Invalid curve mode');
    }
    if (typeof candidate.mirrored !== 'boolean') throw new RangeError('Invalid reflection');
    const curve = record(candidate.spectreCurve);
    if (curve.kind !== 'cubicBezier') throw new RangeError('Invalid Bezier curve');
    const polyline = record(candidate.spectrePolyline);
    if (
        polyline.kind !== 'polyline' ||
        !Array.isArray(polyline.points) ||
        polyline.points.length < 2
    ) {
        throw new RangeError('Invalid polyline');
    }
    return {
        parameterMode: candidate.parameterMode,
        shape: shape(candidate.shape),
        spectreCurveMode: candidate.spectreCurveMode,
        spectreCurve: {
            kind: 'cubicBezier',
            c1: point(curve.c1, 'spectreCurve.c1'),
            c2: point(curve.c2, 'spectreCurve.c2'),
        },
        spectrePolyline: {
            kind: 'polyline',
            points: polyline.points.map((value, index) => point(value, `spectrePolyline.${index}`)),
        },
        a,
        b,
        mirrored: candidate.mirrored,
    };
}

function exportSettings(value: unknown): Export3dSettings {
    const candidate = record(value);
    const settings: Export3dSettings = {
        unitMm: finite(candidate.unitMm, 'unitMm'),
        thickness: finite(candidate.thickness, 'thickness'),
        bevel: finite(candidate.bevel, 'bevel'),
        curveToleranceMm: finite(candidate.curveToleranceMm, 'curveToleranceMm'),
        outerShape:
            candidate.outerShape === 'silhouette' || candidate.outerShape === 'rectangle'
                ? candidate.outerShape
                : (() => {
                      throw new RangeError('Invalid outer shape');
                  })(),
        clearance: finite(candidate.clearance, 'clearance'),
        frameWidth: finite(candidate.frameWidth, 'frameWidth'),
        baseThickness: finite(candidate.baseThickness, 'baseThickness'),
        wallHeight: finite(candidate.wallHeight, 'wallHeight'),
    };
    if (
        settings.unitMm <= 0 ||
        settings.thickness <= 0 ||
        settings.bevel < 0 ||
        settings.bevel >= settings.thickness ||
        settings.curveToleranceMm <= 0 ||
        settings.clearance < 0 ||
        settings.frameWidth <= 0 ||
        settings.baseThickness <= 0 ||
        settings.wallHeight <= 0
    ) {
        throw new RangeError('Invalid 3D export dimensions');
    }
    return settings;
}

export function parseExportProfile(value: unknown): ExportProfile {
    const candidate = record(value);
    if (candidate.version !== 1) throw new RangeError('Unsupported profile version');
    if (typeof candidate.savedAt !== 'string' || !Number.isFinite(Date.parse(candidate.savedAt))) {
        throw new RangeError('Invalid save date');
    }
    return {
        version: 1,
        savedAt: candidate.savedAt,
        patch: patchParameters(candidate.patch),
        export3d: exportSettings(candidate.export3d),
    };
}

export function parseExportProfileJson(json: string): ExportProfile {
    try {
        return parseExportProfile(JSON.parse(json));
    } catch (error) {
        throw error instanceof RangeError ? error : new RangeError('Invalid profile JSON');
    }
}

export function createExportProfile(
    state: TileState,
    settings: Export3dSettings,
    savedAt = new Date().toISOString(),
): ExportProfile {
    return parseExportProfile({
        version: 1,
        savedAt,
        patch: {
            parameterMode: state.parameterMode,
            shape: state.shape,
            spectreCurve: state.spectreCurve,
            spectrePolyline: state.spectrePolyline,
            spectreCurveMode: state.spectreCurveMode,
            a: state.a,
            b: state.b,
            mirrored: state.mirrored,
        },
        export3d: settings,
    });
}

export function loadExportProfile(storage: Pick<Storage, 'getItem'>): ExportProfile | null {
    const json = storage.getItem(EXPORT_PROFILE_STORAGE_KEY);
    if (json === null) return null;
    try {
        return parseExportProfileJson(json);
    } catch {
        return null;
    }
}
