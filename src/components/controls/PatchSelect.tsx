/** Selects the Tile/Spectre family and, within Spectre, an optional patch. */

import { SPECTRE_PATCHES, type SpectrePatchKey } from '../../geometry/smithPatch';
import { SPECTRE_REGION_KEYS } from '../../geometry/spectreRegion';
import { ARTICULATED_WORM_KEYS } from '../../geometry/spectreWorm';
import {
    MAX_SPECTRE_WRIGGLY_LEVEL,
    SPECTRE_WRIGGLY_KINDS,
} from '../../geometry/spectreWrigglyPatch';
import {
    MAX_TILE_PATCH_LEVEL,
    TILE_PATCH_KINDS,
    type TilePatchKind,
} from '../../geometry/tileArticulatedPatch';
import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import type {
    AssemblyTileMode,
    RegionPlacementMode,
    ShapeSelection,
} from '../../state/tileReducer';
import { Segmented } from '../ui/Segmented';

const PATCH_KEYS = Object.keys(SPECTRE_PATCHES) as SpectrePatchKey[];
const TILE_PATCH_LEVELS = Array.from({ length: MAX_TILE_PATCH_LEVEL + 1 }, (_, level) => level);
const SPECTRE_WRIGGLY_LEVELS = Array.from(
    { length: MAX_SPECTRE_WRIGGLY_LEVEL + 1 },
    (_, level) => level,
);

export function PatchFamilySelect() {
    const { shape, lang } = useTileState();
    const dispatch = useTileDispatch();
    const spectre = shape.kind === 'spectre' || shape.kind === 'spectreWriggly';
    const wriggly = shape.kind === 'spectreWriggly' || shape.kind === 'wrigglyPatch';
    const t = TRANSLATIONS[lang];
    return (
        <Segmented<'articulated' | 'wriggly'>
            name="patch-family"
            value={wriggly ? 'wriggly' : 'articulated'}
            options={[
                { value: 'articulated', label: t.articulated },
                { value: 'wriggly', label: t.wriggly },
            ]}
            onChange={(family) =>
                dispatch({
                    type: 'setShape',
                    shape: spectre
                        ? family === 'wriggly'
                            ? 'spectreWriggly'
                            : 'spectre'
                        : family === 'wriggly'
                          ? 'wrigglyPatch'
                          : 'articulatedPatch',
                })
            }
            containerStyle={{ width: '100%' }}
            optionStyle={{ flex: 1, justifyContent: 'center' }}
        />
    );
}

export function SpectreWrigglyPatchSelect() {
    const { shape, lang } = useTileState();
    const dispatch = useTileDispatch();
    if (shape.kind !== 'spectreWriggly') return null;
    return (
        <div className="shape-grid">
            {SPECTRE_WRIGGLY_KINDS.map((patch) => (
                <button
                    key={patch}
                    type="button"
                    className={`btn shape-opt${shape.patch === patch ? ' active' : ''}`}
                    onClick={() => dispatch({ type: 'setSpectreWrigglyPatch', patch })}
                >
                    {patch}
                </button>
            ))}
            <label className="patch-level">
                {TRANSLATIONS[lang].regionLevel}
                <select
                    aria-label={TRANSLATIONS[lang].regionLevel}
                    value={shape.level}
                    onChange={(e) =>
                        dispatch({ type: 'setSpectreWrigglyPatch', level: Number(e.target.value) })
                    }
                >
                    {SPECTRE_WRIGGLY_LEVELS.map((level) => (
                        <option key={level} value={level}>
                            {level}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    );
}

export function AssemblyTileModeSelect() {
    const { assemblyTileMode, lang } = useTileState();
    const dispatch = useTileDispatch();
    const t = TRANSLATIONS[lang];

    return (
        <Segmented<AssemblyTileMode>
            name="assembly-tile-mode"
            value={assemblyTileMode}
            options={[
                { value: 'hatTurtle', label: t.assemblyHatTurtle },
                { value: 'spectre', label: t.assemblySpectre },
            ]}
            onChange={(mode) => dispatch({ type: 'setAssemblyTileMode', mode })}
            containerStyle={{ width: '100%' }}
            optionStyle={{ flex: 1, justifyContent: 'center' }}
        />
    );
}

export function ShapeToggle() {
    const { lang, shape } = useTileState();
    const dispatch = useTileDispatch();
    const t = TRANSLATIONS[lang];

    return (
        <Segmented<Exclude<ShapeSelection['kind'], 'wrigglyPatch' | 'spectreWriggly'>>
            name="shape"
            value={
                shape.kind === 'wrigglyPatch'
                    ? 'articulatedPatch'
                    : shape.kind === 'spectreWriggly'
                      ? 'spectre'
                      : shape.kind
            }
            options={[
                { value: 'tile', label: t.shapeTile },
                { value: 'spectre', label: t.shapeSpectre },
                { value: 'articulatedPatch', label: t.shapeArticulatedPatch },
                { value: 'articulatedWorm', label: t.shapeArticulatedWorm },
                { value: 'region', label: t.shapeRegion },
            ]}
            onChange={(kind) => dispatch({ type: 'setShape', shape: kind })}
            containerStyle={{ width: '100%' }}
            optionStyle={{ flex: 1, minWidth: 0, justifyContent: 'center', padding: '7px' }}
        />
    );
}

export function TileArticulatedPatchSelect() {
    const { shape, lang } = useTileState();
    const dispatch = useTileDispatch();
    const t = TRANSLATIONS[lang];
    if (shape.kind !== 'articulatedPatch' && shape.kind !== 'wrigglyPatch') return null;
    const action =
        shape.kind === 'wrigglyPatch'
            ? ('setTileWrigglyPatch' as const)
            : ('setTilePatch' as const);
    return (
        <div className="shape-grid">
            <Segmented<TilePatchKind>
                name="patch-function"
                value={shape.patch}
                options={TILE_PATCH_KINDS.map((value) => ({ value, label: value }))}
                onChange={(patch) => dispatch({ type: action, patch })}
                containerStyle={{ gridColumn: '1 / -1', width: '100%' }}
                optionStyle={{ flex: 1, justifyContent: 'center' }}
            />
            <label className="patch-level">
                {t.regionLevel}
                <select
                    aria-label={t.regionLevel}
                    value={shape.level}
                    onChange={(event) =>
                        dispatch({ type: action, level: Number(event.target.value) })
                    }
                >
                    {TILE_PATCH_LEVELS.map((level) => (
                        <option key={level} value={level}>
                            {level}
                        </option>
                    ))}
                </select>
            </label>
        </div>
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
