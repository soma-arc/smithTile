import { fmtMath } from '../../format';
import { polykiteValid } from '../../geometry/kiteGrid';
import { closureError, createSmithTile, isAperiodic, SQRT3 } from '../../geometry/smithTile';
import {
    MIRRORED_MONOTILE_SPECTRE_REGIONS,
    MIRRORED_SPECTRE_REGIONS,
    MONOTILE_SPECTRE_REGIONS,
    regionTiles,
    SPECTRE_REGIONS,
} from '../../geometry/spectreRegion';
import {
    ARTICULATED_WORMS,
    MIRRORED_ARTICULATED_WORMS,
    MIRRORED_SPECTRE_WORMS,
    SPECTRE_WORMS,
} from '../../geometry/spectreWorm';
import {
    getSpectreWrigglyPatch,
    SPECTRE_WRIGGLY_COLORS,
    SPECTRE_WRIGGLY_KINDS,
} from '../../geometry/spectreWrigglyPatch';
import { IDENTITY_TRANSFORM } from '../../geometry/Transform';
import {
    getTileArticulatedPatch,
    TILE_PATCH_COLORS,
    TILE_PATCH_KINDS,
} from '../../geometry/tileArticulatedPatch';
import { getTileWrigglyPatch } from '../../geometry/tileWrigglyPatch';
import { useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import { Tag } from '../ui/Tag';
import { SpectreCurveEditor } from './SpectreCurveEditor';
import { TilePaintEditor } from './TilePaintEditor';

const APERIODIC_TAG = { background: 'var(--color-accent-100)', color: 'var(--color-accent-800)' };
const PERIODIC_TAG = { background: 'var(--color-neutral-200)', color: 'var(--color-neutral-800)' };
const POLYKITE_YES_TAG = {
    background: 'var(--color-accent-100)',
    color: 'var(--color-accent-800)',
};
const POLYKITE_NO_TAG = {
    background: 'var(--color-neutral-200)',
    color: 'var(--color-neutral-700)',
};

export function InfoPanel() {
    const { a: tileA, assemblyTileMode, b: tileB, lang, mirrored, shape } = useTileState();
    const t = TRANSLATIONS[lang];
    if (
        shape.kind === 'articulatedPatch' ||
        shape.kind === 'wrigglyPatch' ||
        shape.kind === 'spectreWriggly'
    ) {
        const patch =
            shape.kind === 'spectreWriggly'
                ? getSpectreWrigglyPatch(shape.patch, shape.level, mirrored)
                : shape.kind === 'wrigglyPatch'
                  ? getTileWrigglyPatch(tileA, tileB, shape.patch, shape.level, mirrored)
                  : getTileArticulatedPatch(tileA, tileB, shape.patch, shape.level, mirrored);
        const kinds: readonly string[] =
            shape.kind === 'spectreWriggly' ? [...SPECTRE_WRIGGLY_KINDS, 'T'] : TILE_PATCH_KINDS;
        const colors: Readonly<Record<string, string>> =
            shape.kind === 'spectreWriggly' ? SPECTRE_WRIGGLY_COLORS : TILE_PATCH_COLORS;
        return (
            <aside className="info">
                <h6>{t.info}</h6>
                {shape.kind === 'spectreWriggly' && <SpectreCurveEditor />}
                <TilePaintEditor />
                <div className="info-stat-label">
                    {shape.kind === 'spectreWriggly'
                        ? 'Spectre Wriggly'
                        : shape.kind === 'wrigglyPatch'
                          ? t.tileWrigglyPatches
                          : t.tileArticulatedPatches}
                </div>
                <div className="info-stat-value">
                    {shape.patch}
                    {shape.level}
                </div>
                <div className="info-list">
                    <div className="info-row">
                        <span className="k">{t.regionLevel}</span>
                        <span className="v">{shape.level}</span>
                    </div>
                    <div className="info-row">
                        <span className="k">{t.tileCount}</span>
                        <span className="v">{patch.tiles.length}</span>
                    </div>
                </div>
                <div>
                    <div className="info-block-label">{t.componentColors}</div>
                    <fieldset className="component-legend" aria-label={t.componentColors}>
                        {kinds.map((kind) => (
                            <div className="component-legend-item" key={kind}>
                                <span
                                    className="component-legend-swatch"
                                    style={{ backgroundColor: colors[kind] }}
                                />
                                <span>{kind}</span>
                            </div>
                        ))}
                    </fieldset>
                </div>
            </aside>
        );
    }
    if (shape.kind === 'region') {
        const regions =
            assemblyTileMode === 'spectre'
                ? mirrored
                    ? MIRRORED_MONOTILE_SPECTRE_REGIONS
                    : MONOTILE_SPECTRE_REGIONS
                : mirrored
                  ? MIRRORED_SPECTRE_REGIONS
                  : SPECTRE_REGIONS;
        const region = regions[shape.region];
        return (
            <aside className="info">
                <h6>{t.info}</h6>
                {assemblyTileMode === 'spectre' && <SpectreCurveEditor />}
                <TilePaintEditor />
                <div>
                    <div className="info-stat-label">Spectre Region</div>
                    <div className="info-stat-value">{shape.region}</div>
                </div>
                <hr className="hr" style={{ margin: '2px 0' }} />
                <div className="info-list">
                    <div className="info-row">
                        <span className="k">{t.regionLevel}</span>
                        <span className="v">{region.level}</span>
                    </div>
                    <div className="info-row">
                        <span className="k">{t.wormCount}</span>
                        <span className="v">{region.worms.length}</span>
                    </div>
                    <div className="info-row">
                        <span className="k">{t.tileCount}</span>
                        <span className="v">{regionTiles(region).length}</span>
                    </div>
                </div>
            </aside>
        );
    }
    if (shape.kind === 'articulatedWorm') {
        const worms =
            assemblyTileMode === 'spectre'
                ? mirrored
                    ? MIRRORED_SPECTRE_WORMS
                    : SPECTRE_WORMS
                : mirrored
                  ? MIRRORED_ARTICULATED_WORMS
                  : ARTICULATED_WORMS;
        const worm = worms[shape.worm];
        return (
            <aside className="info">
                <h6>{t.info}</h6>
                {assemblyTileMode === 'spectre' && <SpectreCurveEditor />}
                <TilePaintEditor />
                <div>
                    <div className="info-stat-label">Articulated Worm</div>
                    <div className="info-stat-value">{shape.worm}</div>
                </div>
                <hr className="hr" style={{ margin: '2px 0' }} />
                <div className="info-list">
                    <div className="info-row">
                        <span className="k">{t.family}</span>
                        <span className="v">{t.articulated}</span>
                    </div>
                    <div className="info-row">
                        <span className="k">{t.tileCount}</span>
                        <span className="v">{worm.tiles.length}</span>
                    </div>
                    <div className="info-row">
                        <span className="k">{t.frontEnd}</span>
                        <span className="v">{worm.front.atomKind}</span>
                    </div>
                    <div className="info-row">
                        <span className="k">{t.rearEnd}</span>
                        <span className="v">{worm.rear.atomKind}</span>
                    </div>
                </div>
            </aside>
        );
    }
    const isSpectre = shape.kind === 'spectre';
    const a = isSpectre ? 1 : tileA;
    const b = isSpectre ? 1 : tileB;

    const pkValid = polykiteValid(a, b);
    const isException = !isSpectre && !isAperiodic(createSmithTile(a, b, IDENTITY_TRANSFORM));
    const ratioStr =
        a > 0 ? (Math.abs(b / a - SQRT3) < 1e-6 ? '√3 ≈ 1.732' : (b / a).toFixed(3)) : '∞';
    const err = closureError(a, b);
    const closureStr = err < 1e-12 ? '< 1e-12' : err.toExponential(1);

    return (
        <aside className="info">
            <h6>{t.info}</h6>

            {isSpectre && <SpectreCurveEditor />}
            <TilePaintEditor />

            <div>
                <div className="info-stat-label">a : b</div>
                <div className="info-stat-value">{`${fmtMath(a)} : ${fmtMath(b)}`}</div>
            </div>
            <div>
                <div className="info-stat-label">b / a</div>
                <div className="info-stat-value">{ratioStr}</div>
            </div>

            <hr className="hr" style={{ margin: '2px 0' }} />

            <div className="info-list">
                <div className="info-row">
                    <span className="k">{t.edgeCount}</span>
                    <span className="v">{`14 (${t.shown} 13)`}</span>
                </div>
                <div className="info-row">
                    <span className="k">{t.closure}</span>
                    <span className="v">{closureStr}</span>
                </div>
                <div>
                    <div className="info-block-label">{t.family}</div>
                    <Tag
                        label={isException ? t.periodic : t.aperiodic}
                        style={isException ? PERIODIC_TAG : APERIODIC_TAG}
                    />
                </div>
                <div>
                    <div className="info-block-label">{t.polykiteLabel}</div>
                    <Tag
                        label={pkValid ? t.polykiteYes : t.polykiteNo}
                        style={pkValid ? POLYKITE_YES_TAG : POLYKITE_NO_TAG}
                    />
                </div>
            </div>
        </aside>
    );
}
