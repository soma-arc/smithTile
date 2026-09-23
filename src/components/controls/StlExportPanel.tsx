/**
 * Saves the Tile(a, b) or single Spectre currently on screen as a 3D-printable STL slab.
 *
 * Spectre patches remain a later step.
 */

import { useState } from 'react';
import { downloadBytes } from '../../export/download';
import {
    SPECTRE_STL_FILENAME,
    STL_MIME_TYPE,
    spectreStl,
    stlFilename,
    tileStl,
} from '../../export/stl';
import { STRAIGHT_CURVE } from '../../geometry/smithTile';
import { useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';

export function StlExportPanel() {
    const { lang, a, b, mirrored, shape, spectreCurve, spectreCurveMode, spectrePolyline } =
        useTileState();
    const [error, setError] = useState<string | null>(null);
    const t = TRANSLATIONS[lang];
    const save = () => {
        try {
            setError(null);
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
                setError(t.stlInvalidBoundary);
                return;
            }
            throw cause;
        }
    };

    return (
        <>
            <button type="button" className="btn btn-primary" onClick={save}>
                {t.saveStl}
            </button>
            {error && <div role="alert">{error}</div>}
        </>
    );
}
