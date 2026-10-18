/**
 * Saves single tiles or a straight-edged patch with beveled top edges.
 */

import { useEffect, useRef, useState } from 'react';
import { downloadBytes } from '../../export/download';
import { DEFAULT_PATCH_STL_OPTIONS } from '../../export/patchStl';
import { startPatchStlJob } from '../../export/patchStlJob';
import {
    SPECTRE_STL_FILENAME,
    STL_MIME_TYPE,
    spectreStl,
    stlFilename,
    tileStl,
} from '../../export/stl';
import { SPECTRE_PATCHES } from '../../geometry/smithPatch';
import { STRAIGHT_CURVE } from '../../geometry/smithTile';
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
    });
    const [saving, setSaving] = useState(false);
    const job = useRef<ReturnType<typeof startPatchStlJob> | null>(null);
    useEffect(() => () => job.current?.cancel(), []);
    const t = TRANSLATIONS[lang];
    const patchKey = shape.kind === 'spectre' ? shape.patch : null;
    const emptyPatch = patchKey !== null && SPECTRE_PATCHES[patchKey].tiles.length === 0;
    const save = async () => {
        if (saving) return;
        try {
            setError(null);
            if (patchKey) {
                setSaving(true);
                job.current = startPatchStlJob({
                    patchKey,
                    options: {
                        unitMm: Number.parseFloat(options.unitMm),
                        thickness: Number.parseFloat(options.thickness),
                        bevel: Number.parseFloat(options.bevel),
                    },
                });
                downloadBytes(
                    await job.current.result,
                    `patch-${patchKey}-straight.stl`,
                    STL_MIME_TYPE,
                );
                return;
            }
            if (shape.kind === 'spectre') {
                const curve =
                    spectreCurveMode === 'straight'
                        ? STRAIGHT_CURVE
                        : spectreCurveMode === 'polyline'
                          ? spectrePolyline
                          : spectreCurve;
                downloadBytes(spectreStl(curve), SPECTRE_STL_FILENAME, STL_MIME_TYPE);
                return;
            }
            downloadBytes(tileStl(a, b, { mirrored }), stlFilename(a, b, mirrored), STL_MIME_TYPE);
        } catch (cause) {
            if (cause instanceof RangeError) {
                setError(patchKey ? t.stlInvalidPatch : t.stlInvalidBoundary);
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
            {patchKey && (
                <>
                    <p>{t.stlPatchDescription}</p>
                    {(
                        [
                            ['unitMm', t.stlUnitMm],
                            ['thickness', t.stlThickness],
                            ['bevel', t.stlBevel],
                        ] as const
                    ).map(([key, label]) => (
                        <label key={key} style={{ display: 'block' }}>
                            {label}
                            <input
                                type="number"
                                min={key === 'bevel' ? 0 : 0.1}
                                step="0.1"
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
                {saving ? t.stlGenerating : patchKey ? t.savePatchStl : t.saveStl}
            </button>
            {error && <div role="alert">{error}</div>}
        </>
    );
}
