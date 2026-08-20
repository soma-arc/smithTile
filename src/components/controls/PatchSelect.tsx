/** Selects the Tile/Spectre family and, within Spectre, an optional patch. */

import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import { SPECTRE_PATCHES, type SpectrePatchKey } from '../../smithPatch';
import type { ShapeSelection } from '../../state/tileReducer';
import { Segmented } from '../ui/Segmented';

const PATCH_KEYS = Object.keys(SPECTRE_PATCHES) as SpectrePatchKey[];

export function ShapeToggle() {
    const { lang, shape } = useTileState();
    const dispatch = useTileDispatch();
    const t = TRANSLATIONS[lang];

    return (
        <Segmented<ShapeSelection['kind']>
            name="shape"
            value={shape.kind}
            options={[
                { value: 'tile', label: t.shapeTile },
                { value: 'spectre', label: t.shapeSpectre },
            ]}
            onChange={(kind) => dispatch({ type: 'setShape', shape: kind })}
            containerStyle={{ width: '100%' }}
            optionStyle={{ flex: 1, justifyContent: 'center' }}
        />
    );
}

export function SpectrePatchSelect() {
    const { lang, shape } = useTileState();
    const dispatch = useTileDispatch();
    const t = TRANSLATIONS[lang];
    const patch = shape.kind === 'spectre' ? shape.patch : null;

    return (
        <div className="shape-grid">
            <button
                type="button"
                className={`btn shape-opt${patch === null ? ' active' : ''}`}
                onClick={() => dispatch({ type: 'setSpectrePatch', patch: null })}
            >
                {t.spectreSingle}
            </button>
            {PATCH_KEYS.map((key) => (
                <button
                    key={key}
                    type="button"
                    className={`btn shape-opt${patch === key ? ' active' : ''}`}
                    onClick={() => dispatch({ type: 'setSpectrePatch', patch: key })}
                >
                    {key}
                </button>
            ))}
        </div>
    );
}
