import { fmtNum } from '../../format';
import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { PRESETS } from '../../smithTile';

export function PresetGrid() {
    const { lang, presetName } = useTileState();
    const dispatch = useTileDispatch();
    return (
        <div className="preset-grid">
            {PRESETS.map((p) => {
                const nick = p.nick[lang];
                const coords = `(${fmtNum(p.a)}, ${fmtNum(p.b)})`;
                const label = /Tile\(/.test(nick) ? nick : `${nick}\n${coords}`;
                const active = presetName === p.key;
                return (
                    <button
                        key={p.key}
                        type="button"
                        className={`btn tv-preset${active ? ' active' : ''}`}
                        onClick={() => dispatch({ type: 'applyPreset', preset: p })}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}
