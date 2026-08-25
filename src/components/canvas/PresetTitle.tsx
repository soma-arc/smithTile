import { fmtNum } from '../../format';
import { useTileState } from '../../hooks/useTileState';
import { findPreset } from '../../smithTile';

export function PresetTitle() {
    const { a, b, shape, presetName, lang } = useTileState();
    const preset = findPreset(presetName);
    const title =
        shape.kind === 'articulatedWorm'
            ? `Articulated Worm  ${shape.worm}`
            : shape.kind === 'spectre'
              ? shape.patch
                  ? `Spectre Patch  ${shape.patch}`
                  : 'Spectre  Tile(1, 1)'
              : `${preset ? `${preset.nick[lang]}  ` : ''}Tile(${fmtNum(a)}, ${fmtNum(b)})`;
    return <div className="preset-title">{title}</div>;
}
