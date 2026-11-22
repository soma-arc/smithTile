/**
 * Saves single tiles or a curved patch with beveled top edges.
 */

import { useEffect, useRef, useState } from 'react';
import { downloadBytes } from '../../export/download';
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
import { useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';

export function StlExportPanel() {
    const { lang, a, b, mirrored, shape, spectreCurve, spectreCurveMode, spectrePolyline } =
        useTileState();
    const [error, setError] = useState<string | null>(null);
    const [options, setOptions] = useState({
        unitMm: String(DEFAULT_PATCH_STL_OPTIONS.unitMm),
        thickness: String(DEFAULT_PATCH_STL_OPTIONS.thickness),
        bevel: String(DEFAULT_PATCH_STL_OPTIONS.bevel),
        curveToleranceMm: String(DEFAULT_PATCH_STL_OPTIONS.curveToleranceMm),
    });
    const [trayOptions, setTrayOptions] = useState({
        clearance: String(DEFAULT_PATCH_TRAY_OPTIONS.clearance),
        frameWidth: String(DEFAULT_PATCH_TRAY_OPTIONS.frameWidth),
        baseThickness: String(DEFAULT_PATCH_TRAY_OPTIONS.baseThickness),
        wallHeight: String(DEFAULT_PATCH_TRAY_OPTIONS.wallHeight),
    });
    const [trayOuterShape, setTrayOuterShape] = useState<'silhouette' | 'rectangle'>(
        DEFAULT_PATCH_TRAY_OPTIONS.outerShape,
    );
    const [saving, setSaving] = useState<'patch' | 'tray' | null>(null);
    const job = useRef<ReturnType<typeof startPatchStlJob> | null>(null);
    useEffect(() => () => job.current?.cancel(), []);
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
                        : startPatchStlJob({ ...selection, output: 'patch', options: patchOptions });
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
                    {emptyPatch && <p>{t.stlEmptyPatch}</p>}
                </>
            )}
            {error && <div role="alert">{error}</div>}
        </>
    );
}
