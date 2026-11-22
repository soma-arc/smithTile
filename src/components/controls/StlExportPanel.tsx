/**
 * Saves single tiles or a curved patch with beveled top edges.
 */

import { useEffect, useRef, useState } from 'react';
import { downloadBytes } from '../../export/download';
import {
    createExportProfile,
    type Export3dSettings,
    EXPORT_PROFILE_FILENAME,
    EXPORT_PROFILE_STORAGE_KEY,
    loadExportProfile,
    parseExportProfileJson,
    type ExportProfile,
} from '../../export/exportProfile';
import { DEFAULT_PATCH_STL_OPTIONS } from '../../export/patchStl';
import { type PatchStlErrorCode, PatchStlValidationError } from '../../export/patchStlError';
import { startPatchStlJob } from '../../export/patchStlJob';
import { DEFAULT_PATCH_TRAY_OPTIONS } from '../../export/patchTray';
import { STL_MIME_TYPE, stlFilename, tileStl } from '../../export/stl';
import { fmtNum } from '../../format';
import { SPECTRE_PATCHES } from '../../geometry/smithPatch';
import { STRAIGHT_CURVE } from '../../geometry/smithTile';
import { getSpectreWrigglyPatch } from '../../geometry/spectreWrigglyPatch';
import { getTileArticulatedPatch } from '../../geometry/tileArticulatedPatch';
import { getTileWrigglyPatch } from '../../geometry/tileWrigglyPatch';
import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import { initialTileState } from '../../state/tileReducer';

const DEFAULT_EXPORT_SETTINGS: Export3dSettings = {
    unitMm: DEFAULT_PATCH_STL_OPTIONS.unitMm,
    thickness: DEFAULT_PATCH_STL_OPTIONS.thickness,
    bevel: DEFAULT_PATCH_STL_OPTIONS.bevel,
    curveToleranceMm: DEFAULT_PATCH_STL_OPTIONS.curveToleranceMm,
    ...DEFAULT_PATCH_TRAY_OPTIONS,
};

function safelyLoadProfile(): ExportProfile | null {
    try {
        return loadExportProfile(window.localStorage);
    } catch {
        return null;
    }
}

export function StlExportPanel() {
    const state = useTileState();
    const dispatch = useTileDispatch();
    const { lang, a, b, mirrored, shape, spectreCurve, spectreCurveMode, spectrePolyline } = state;
    const [initialProfile] = useState(safelyLoadProfile);
    const [error, setError] = useState<string | null>(null);
    const [profileStatus, setProfileStatus] = useState<string | null>(null);
    const [options, setOptions] = useState({
        unitMm: String(initialProfile?.export3d.unitMm ?? DEFAULT_EXPORT_SETTINGS.unitMm),
        thickness: String(initialProfile?.export3d.thickness ?? DEFAULT_EXPORT_SETTINGS.thickness),
        bevel: String(initialProfile?.export3d.bevel ?? DEFAULT_EXPORT_SETTINGS.bevel),
        curveToleranceMm: String(
            initialProfile?.export3d.curveToleranceMm ?? DEFAULT_EXPORT_SETTINGS.curveToleranceMm,
        ),
    });
    const [trayOptions, setTrayOptions] = useState({
        clearance: String(initialProfile?.export3d.clearance ?? DEFAULT_EXPORT_SETTINGS.clearance),
        frameWidth: String(
            initialProfile?.export3d.frameWidth ?? DEFAULT_EXPORT_SETTINGS.frameWidth,
        ),
        baseThickness: String(
            initialProfile?.export3d.baseThickness ?? DEFAULT_EXPORT_SETTINGS.baseThickness,
        ),
        wallHeight: String(
            initialProfile?.export3d.wallHeight ?? DEFAULT_EXPORT_SETTINGS.wallHeight,
        ),
    });
    const [trayOuterShape, setTrayOuterShape] = useState<'silhouette' | 'rectangle'>(
        initialProfile?.export3d.outerShape ?? DEFAULT_EXPORT_SETTINGS.outerShape,
    );
    const [saving, setSaving] = useState<'patch' | 'tray' | null>(null);
    const job = useRef<ReturnType<typeof startPatchStlJob> | null>(null);
    useEffect(() => {
        if (initialProfile) {
            dispatch({ type: 'restoreSavedPatchParameters', parameters: initialProfile.patch });
        }
        return () => job.current?.cancel();
    }, [dispatch, initialProfile]);
    const t = TRANSLATIONS[lang];
    const patchKey = shape.kind === 'spectre' ? shape.patch : null;
    const isSingleSpectre = shape.kind === 'spectre' && patchKey === null;
    const isTilePatch = shape.kind === 'articulatedPatch' || shape.kind === 'wrigglyPatch';
    const selection =
        shape.kind === 'spectreWriggly'
            ? { spectreWrigglyPatch: { patch: shape.patch, level: shape.level, mirrored } }
            : isTilePatch
              ? {
                    tilePatch: {
                        a,
                        b,
                        patch: shape.patch,
                        level: shape.level,
                        mirrored,
                        family:
                            shape.kind === 'wrigglyPatch'
                                ? ('wriggly' as const)
                                : ('articulated' as const),
                    },
                }
              : shape.kind === 'spectre'
                ? patchKey
                    ? { patchKey }
                    : { singleSpectre: true as const }
                : null;
    const emptyPatch =
        shape.kind === 'spectreWriggly'
            ? getSpectreWrigglyPatch(shape.patch, shape.level).tiles.length === 0
            : isTilePatch
              ? (shape.kind === 'wrigglyPatch' ? getTileWrigglyPatch : getTileArticulatedPatch)(
                    a,
                    b,
                    shape.patch,
                    shape.level,
                ).tiles.length === 0
              : patchKey !== null && SPECTRE_PATCHES[patchKey].tiles.length === 0;
    const activeCurve =
        spectreCurveMode === 'straight'
            ? STRAIGHT_CURVE
            : spectreCurveMode === 'polyline'
              ? spectrePolyline
              : spectreCurve;
    const patchErrorMessage = (code: PatchStlErrorCode): string => {
        switch (code) {
            case 'emptyPatch':
                return t.stlEmptyPatch;
            case 'invalidScale':
                return t.stlInvalidScale;
            case 'invalidThickness':
                return t.stlInvalidThickness;
            case 'invalidBevel':
                return t.stlInvalidBevel;
            case 'invalidTolerance':
                return t.stlInvalidTolerance;
            case 'invalidClearance':
                return t.stlInvalidClearance;
            case 'invalidFrameWidth':
                return t.stlInvalidFrameWidth;
            case 'invalidBaseThickness':
                return t.stlInvalidBaseThickness;
            case 'invalidWallHeight':
                return t.stlInvalidWallHeight;
            case 'invalidTrayShape':
                return t.stlInvalidTrayShape;
            case 'invalidCurve':
                return t.stlInvalidCurve;
            case 'selfIntersection':
                return t.stlPatchSelfIntersection;
            case 'bevelGeometry':
                return t.stlBevelGeometry;
            case 'overlappingTiles':
                return t.stlOverlappingTiles;
            case 'triangulation':
                return t.stlTriangulationFailed;
        }
    };
    const currentExportSettings = (): Export3dSettings => ({
        unitMm: Number.parseFloat(options.unitMm),
        thickness: Number.parseFloat(options.thickness),
        bevel: Number.parseFloat(options.bevel),
        curveToleranceMm: Number.parseFloat(options.curveToleranceMm),
        outerShape: trayOuterShape,
        clearance: Number.parseFloat(trayOptions.clearance),
        frameWidth: Number.parseFloat(trayOptions.frameWidth),
        baseThickness: Number.parseFloat(trayOptions.baseThickness),
        wallHeight: Number.parseFloat(trayOptions.wallHeight),
    });
    const applyProfile = (profile: ExportProfile) => {
        const settings = profile.export3d;
        setOptions({
            unitMm: String(settings.unitMm),
            thickness: String(settings.thickness),
            bevel: String(settings.bevel),
            curveToleranceMm: String(settings.curveToleranceMm),
        });
        setTrayOptions({
            clearance: String(settings.clearance),
            frameWidth: String(settings.frameWidth),
            baseThickness: String(settings.baseThickness),
            wallHeight: String(settings.wallHeight),
        });
        setTrayOuterShape(settings.outerShape);
        dispatch({ type: 'restoreSavedPatchParameters', parameters: profile.patch });
    };
    const currentProfile = () => createExportProfile(state, currentExportSettings());
    const saveProfile = () => {
        try {
            const profile = currentProfile();
            localStorage.setItem(EXPORT_PROFILE_STORAGE_KEY, JSON.stringify(profile));
            setError(null);
            setProfileStatus(t.exportSettingsSaved);
        } catch {
            setProfileStatus(null);
            setError(t.exportSettingsInvalid);
        }
    };
    const exportProfileJson = () => {
        try {
            const json = `${JSON.stringify(currentProfile(), null, 2)}\n`;
            downloadBytes(
                new TextEncoder().encode(json) as Uint8Array<ArrayBuffer>,
                EXPORT_PROFILE_FILENAME,
                'application/json',
            );
            setError(null);
        } catch {
            setError(t.exportSettingsInvalid);
        }
    };
    const importProfileJson = async (file: File) => {
        try {
            const profile = parseExportProfileJson(await file.text());
            localStorage.setItem(EXPORT_PROFILE_STORAGE_KEY, JSON.stringify(profile));
            applyProfile(profile);
            setError(null);
            setProfileStatus(t.exportSettingsLoaded);
        } catch {
            setProfileStatus(null);
            setError(t.exportSettingsInvalid);
        }
    };
    const resetProfile = () => {
        localStorage.removeItem(EXPORT_PROFILE_STORAGE_KEY);
        applyProfile(createExportProfile(initialTileState, DEFAULT_EXPORT_SETTINGS));
        setError(null);
        setProfileStatus(t.exportSettingsReset);
    };
    const save = async (output: 'patch' | 'tray' = 'patch') => {
        if (saving) return;
        try {
            setError(null);
            if (selection) {
                setSaving(output);
                const patchOptions = {
                    unitMm: Number.parseFloat(options.unitMm),
                    thickness: Number.parseFloat(options.thickness),
                    bevel: Number.parseFloat(options.bevel),
                    edgeCurve: isTilePatch ? STRAIGHT_CURVE : activeCurve,
                    curveToleranceMm: Number.parseFloat(options.curveToleranceMm),
                };
                job.current =
                    output === 'tray'
                        ? startPatchStlJob({
                              ...selection,
                              output: 'tray',
                              options: patchOptions,
                              trayOptions: {
                                  outerShape: trayOuterShape,
                                  clearance: Number.parseFloat(trayOptions.clearance),
                                  frameWidth: Number.parseFloat(trayOptions.frameWidth),
                                  baseThickness: Number.parseFloat(trayOptions.baseThickness),
                                  wallHeight: Number.parseFloat(trayOptions.wallHeight),
                              },
                          })
                        : startPatchStlJob({
                              ...selection,
                              output: 'patch',
                              options: patchOptions,
                          });
                const prefix =
                    output === 'tray'
                        ? `tray${trayOuterShape === 'rectangle' ? '-rectangle' : ''}`
                        : 'patch';
                downloadBytes(
                    await job.current.result,
                    isSingleSpectre
                        ? `${prefix}-spectre-${spectreCurveMode}.stl`
                        : shape.kind === 'spectreWriggly'
                          ? `${prefix}-spectre-wriggly-${shape.patch}${shape.level}${mirrored ? '-mirrored' : ''}-${spectreCurveMode}.stl`
                          : isTilePatch
                            ? `${prefix}-tile-${shape.kind === 'wrigglyPatch' ? 'wriggly-' : ''}a${fmtNum(a)}-b${fmtNum(b)}-${shape.patch}${shape.level}${mirrored ? '-mirrored' : ''}-straight.stl`
                            : `${prefix}-${patchKey}-${spectreCurveMode}.stl`,
                    STL_MIME_TYPE,
                );
                return;
            }
            downloadBytes(tileStl(a, b, { mirrored }), stlFilename(a, b, mirrored), STL_MIME_TYPE);
        } catch (cause) {
            if (cause instanceof PatchStlValidationError) {
                setError(patchErrorMessage(cause.code));
                return;
            }
            if (cause instanceof RangeError) {
                setError(selection ? t.stlInvalidPatch : t.stlInvalidBoundary);
                return;
            }
            setError(t.stlExportFailed);
        } finally {
            job.current = null;
            setSaving(null);
        }
    };

    return (
        <>
            <div className="stl-export-actions">
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => save('patch')}
                    disabled={emptyPatch || saving !== null}
                >
                    {saving === 'patch'
                        ? t.stlGenerating
                        : selection && !isSingleSpectre
                          ? t.savePatchStl
                          : t.saveStl}
                </button>
                {selection && (
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => save('tray')}
                        disabled={emptyPatch || saving !== null}
                    >
                        {saving === 'tray' ? t.stlGenerating : t.savePatchTrayStl}
                    </button>
                )}
            </div>
            {selection && (
                <>
                    <p>{t.stlPatchDescription}</p>
                    {(
                        [
                            ['unitMm', t.stlUnitMm],
                            ['thickness', t.stlThickness],
                            ['bevel', t.stlBevel],
                            ['curveToleranceMm', t.stlCurveTolerance],
                        ] as const
                    ).map(([key, label]) => (
                        <label key={key} style={{ display: 'block' }}>
                            {label}
                            <input
                                type="number"
                                min={key === 'bevel' ? 0 : key === 'curveToleranceMm' ? 0.001 : 0.1}
                                step={key === 'curveToleranceMm' ? 0.01 : 0.1}
                                value={options[key]}
                                onChange={(event) => {
                                    setError(null);
                                    setOptions({ ...options, [key]: event.target.value });
                                }}
                            />
                        </label>
                    ))}
                    <p>{t.stlTrayDescription}</p>
                    <label style={{ display: 'block' }}>
                        {t.stlTrayOuterShape}
                        <select
                            value={trayOuterShape}
                            onChange={(event) => {
                                setError(null);
                                setTrayOuterShape(event.target.value as 'silhouette' | 'rectangle');
                            }}
                        >
                            <option value="silhouette">{t.stlTrayShapeSilhouette}</option>
                            <option value="rectangle">{t.stlTrayShapeRectangle}</option>
                        </select>
                    </label>
                    {(
                        [
                            ['clearance', t.stlTrayClearance],
                            ['frameWidth', t.stlTrayFrameWidth],
                            ['baseThickness', t.stlTrayBaseThickness],
                            ['wallHeight', t.stlTrayWallHeight],
                        ] as const
                    ).map(([key, label]) => (
                        <label key={key} style={{ display: 'block' }}>
                            {label}
                            <input
                                type="number"
                                min={key === 'clearance' ? 0 : 0.1}
                                step={key === 'clearance' ? 0.05 : 0.1}
                                value={trayOptions[key]}
                                onChange={(event) => {
                                    setError(null);
                                    setTrayOptions({ ...trayOptions, [key]: event.target.value });
                                }}
                            />
                        </label>
                    ))}
                    <div className="stl-profile-actions">
                        <button type="button" className="btn" onClick={saveProfile}>
                            {t.saveExportSettings}
                        </button>
                        <button type="button" className="btn" onClick={exportProfileJson}>
                            {t.exportSettingsJson}
                        </button>
                        <label className="btn">
                            {t.importSettingsJson}
                            <input
                                type="file"
                                accept="application/json,.json"
                                hidden
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) void importProfileJson(file);
                                    event.target.value = '';
                                }}
                            />
                        </label>
                        <button type="button" className="btn" onClick={resetProfile}>
                            {t.resetExportSettings}
                        </button>
                    </div>
                    {emptyPatch && <p>{t.stlEmptyPatch}</p>}
                </>
            )}
            {profileStatus && <p role="status">{profileStatus}</p>}
            {error && <div role="alert">{error}</div>}
        </>
    );
}
