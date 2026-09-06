import { fmtNum } from '../../format';
import { useTileState } from '../../hooks/useTileState';
import { findPreset } from '../../geometry/smithTile';

export function PresetTitle() {
    const { a, assemblyTileMode, b, shape, presetName, lang } = useTileState();
    const assemblySuffix = assemblyTileMode === 'spectre' ? '  ·  Spectre' : '';
    const preset = findPreset(presetName);
    const title =
        shape.kind === 'region'
            ? `Spectre Region  ${shape.region}${assemblySuffix}`
            : shape.kind === 'articulatedWorm'
              ? `Articulated Worm  ${shape.worm}${assemblySuffix}`
              : shape.kind === 'spectre'
                ? shape.patch
                    ? `Spectre Patch  ${shape.patch}`
                    : 'Spectre  Tile(1, 1)'
                : `${preset ? `${preset.nick[lang]}  ` : ''}Tile(${fmtNum(a)}, ${fmtNum(b)})`;
    return <div className="preset-title">{title}</div>;
}
