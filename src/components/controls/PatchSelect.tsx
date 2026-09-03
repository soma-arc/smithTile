/** Selects the Tile/Spectre family and, within Spectre, an optional patch. */

import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import { SPECTRE_PATCHES, type SpectrePatchKey } from '../../geometry/smithPatch';
import { SPECTRE_REGION_KEYS } from '../../geometry/spectreRegion';
import { ARTICULATED_WORM_KEYS } from '../../geometry/spectreWorm';
import type { RegionPlacementMode, ShapeSelection } from '../../state/tileReducer';
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
                { value: 'articulatedWorm', label: t.shapeArticulatedWorm },
                { value: 'region', label: t.shapeRegion },
            ]}
            onChange={(kind) => dispatch({ type: 'setShape', shape: kind })}
            containerStyle={{ width: '100%' }}
            optionStyle={{ flex: 1, justifyContent: 'center' }}
        />
    );
}

export function SpectreRegionSelect() {
    const { lang, regionPlacementMode, shape } = useTileState();
    const dispatch = useTileDispatch();
    const t = TRANSLATIONS[lang];
    const region = shape.kind === 'region' ? shape.region : 'PA1';

    return (
        <div className="shape-grid">
            {SPECTRE_REGION_KEYS.map((key) => (
                <button
                    key={key}
                    type="button"
                    className={`btn shape-opt${region === key ? ' active' : ''}`}
                    onClick={() => dispatch({ type: 'setSpectreRegion', region: key })}
                >
                    {key}
                </button>
            ))}
            <Segmented<RegionPlacementMode>
                name="region-placement"
                value={regionPlacementMode}
                options={[
                    { value: 'auto', label: t.regionPlacementAuto },
                    { value: 'manual', label: t.regionPlacementManual },
                ]}
                onChange={(mode) => dispatch({ type: 'setRegionPlacementMode', mode })}
                containerStyle={{ gridColumn: '1 / -1', width: '100%' }}
                optionStyle={{ flex: 1, justifyContent: 'center' }}
            />
            {regionPlacementMode === 'manual' && (
                <button
                    type="button"
                    className="btn shape-opt"
                    style={{ gridColumn: '1 / -1' }}
                    onClick={() => dispatch({ type: 'resetRegionPlacement' })}
                >
                    {t.regionPlacementReset}
                </button>
            )}
        </div>
    );
}

export function ArticulatedWormSelect() {
    const { shape } = useTileState();
    const dispatch = useTileDispatch();
    const worm = shape.kind === 'articulatedWorm' ? shape.worm : 'E';

    return (
        <div className="shape-grid">
            {ARTICULATED_WORM_KEYS.map((key) => (
                <button
                    key={key}
                    type="button"
                    className={`btn shape-opt${worm === key ? ' active' : ''}`}
                    onClick={() => dispatch({ type: 'setArticulatedWorm', worm: key })}
                >
                    {key}
                </button>
            ))}
        </div>
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
