import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';

export function RatioControl() {
    const { lang, a, b } = useTileState();
    const dispatch = useTileDispatch();
    const t = TRANSLATIONS[lang];
    const ratioVal = a > 0 ? Math.min(4, b / a) : 0;
    const readout = a > 0 ? (b / a).toFixed(2) : '∞';
    return (
        <div className="field">
            <label className="field-inline-label" htmlFor="ratio-range">
                <span>{t.ratioLabel}</span> <span className="readout">{readout}</span>
            </label>
            <input
                id="ratio-range"
                type="range"
                min={0}
                max={4}
                step={0.01}
                value={ratioVal}
                onChange={(e) =>
                    dispatch({ type: 'setRatio', ratio: Number.parseFloat(e.target.value) })
                }
            />
            <div className="ratio-ends">
                <span>Chevron</span>
                <span>1 : 1</span>
                <span>Comet →</span>
            </div>
        </div>
    );
}
