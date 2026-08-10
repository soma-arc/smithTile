import { fmtNum } from '../../format';
import { useTileState } from '../../hooks/useTileState';
import { findPreset } from '../../smithTile';

export function PresetTitle() {
    const { a, b, presetName, lang } = useTileState();
    const preset = findPreset(presetName);
    const title = `${preset ? `${preset.nick[lang]}  ` : ''}Tile(${fmtNum(a)}, ${fmtNum(b)})`;
    return <div className="preset-title">{title}</div>;
}
