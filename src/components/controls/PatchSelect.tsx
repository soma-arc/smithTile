/** Selects what to draw: the interactive Tile(a, b) or a prebuilt patch. */

import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import { PATCHES, type PatchKey } from '../../smithTile';

const PATCH_KEYS = Object.keys(PATCHES) as PatchKey[];

export function PatchSelect() {
    const { lang, patch } = useTileState();
    const dispatch = useTileDispatch();
    const t = TRANSLATIONS[lang];

    return (
        <div className="shape-grid">
            <button
                type="button"
                className={`btn shape-opt${patch === null ? ' active' : ''}`}
                onClick={() => dispatch({ type: 'setPatch', patch: null })}
            >
                {t.shapeTile}
            </button>
            {PATCH_KEYS.map((key) => (
                <button
                    key={key}
                    type="button"
                    className={`btn shape-opt${patch === key ? ' active' : ''}`}
                    onClick={() => dispatch({ type: 'setPatch', patch: key })}
                >
                    {key}
                </button>
            ))}
        </div>
    );
}
