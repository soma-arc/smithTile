/**
 * Saves the Tile(a, b) currently on screen as a 3D-printable STL slab.
 *
 * Rendered only in tile mode (see `<ControlsPanel>`); patches are a later step.
 */

import { downloadBytes } from '../../export/download';
import { STL_MIME_TYPE, stlFilename, tileStl } from '../../export/stl';
import { useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';

export function StlExportPanel() {
    const { lang, a, b, mirrored } = useTileState();
    const t = TRANSLATIONS[lang];

    return (
        <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
                downloadBytes(
                    tileStl(a, b, { mirrored }),
                    stlFilename(a, b, mirrored),
                    STL_MIME_TYPE,
                )
            }
        >
            {t.saveStl}
        </button>
    );
}
