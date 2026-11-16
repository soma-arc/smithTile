/**
 * Saves single tiles or a curved patch with beveled top edges.
 */

import { useEffect, useRef, useState } from 'react';
import { downloadBytes } from '../../export/download';
import { DEFAULT_PATCH_STL_OPTIONS } from '../../export/patchStl';
import { type PatchStlErrorCode, PatchStlValidationError } from '../../export/patchStlError';
import { startPatchStlJob } from '../../export/patchStlJob';
import {
    SPECTRE_STL_FILENAME,
    STL_MIME_TYPE,
    spectreStl,
    stlFilename,
    tileStl,
} from '../../export/stl';
import { fmtNum } from '../../format';
import { SPECTRE_PATCHES } from '../../geometry/smithPatch';
import { STRAIGHT_CURVE } from '../../geometry/smithTile';
import { getTileArticulatedPatch } from '../../geometry/tileArticulatedPatch';
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
    const [saving, setSaving] = useState(false);
    const job = useRef<ReturnType<typeof startPatchStlJob> | null>(null);
    useEffect(() => () => job.current?.cancel(), []);
    const t = TRANSLATIONS[lang];
    const patchKey = shape.kind === 'spectre' ? shape.patch : null;
    const selection =
        shape.kind === 'articulatedPatch'
            ? { tilePatch: { a, b, patch: shape.patch, level: shape.level, mirrored } }
            : patchKey
              ? { patchKey }
              : null;
    const emptyPatch =
        shape.kind === 'articulatedPatch'
            ? getTileArticulatedPatch(a, b, shape.patch, shape.level).tiles.length === 0
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
    const save = async () => {
        if (saving) return;
        try {
            setError(null);
            if (selection) {
                setSaving(true);
                job.current = startPatchStlJob({
                    ...selection,
                    options: {
                        unitMm: Number.parseFloat(options.unitMm),
                        thickness: Number.parseFloat(options.thickness),
                        bevel: Number.parseFloat(options.bevel),
                        edgeCurve: shape.kind === 'articulatedPatch' ? STRAIGHT_CURVE : activeCurve,
                        curveToleranceMm: Number.parseFloat(options.curveToleranceMm),
                    },
                });
                downloadBytes(
                    await job.current.result,
                    shape.kind === 'articulatedPatch'
                        ? `patch-tile-a${fmtNum(a)}-b${fmtNum(b)}-${shape.patch}${shape.level}${mirrored ? '-mirrored' : ''}-straight.stl`
                        : `patch-${patchKey}-${spectreCurveMode}.stl`,
                    STL_MIME_TYPE,
                );
                return;
            }
            if (shape.kind === 'spectre') {
                downloadBytes(spectreStl(activeCurve), SPECTRE_STL_FILENAME, STL_MIME_TYPE);
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
            setSaving(false);
        }
    };

    return (
        <>
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
                    {emptyPatch && <p>{t.stlEmptyPatch}</p>}
                </>
            )}
            <button
                type="button"
                className="btn btn-primary"
                onClick={save}
                disabled={emptyPatch || saving}
            >
                {saving ? t.stlGenerating : selection ? t.savePatchStl : t.saveStl}
            </button>
            {error && <div role="alert">{error}</div>}
        </>
    );
}
