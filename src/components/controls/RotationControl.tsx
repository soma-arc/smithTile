import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';

export function RotationControl() {
    const { lang, rotationDeg } = useTileState();
    const dispatch = useTileDispatch();
    const t = TRANSLATIONS[lang];
    return (
        <div className="field" style={{ marginTop: 'var(--space-3)' }}>
            <label className="field-inline-label" htmlFor="rotation-range">
                <span>{t.rotation}</span>{' '}
                <span className="readout">{`${Math.round(rotationDeg)}°`}</span>
            </label>
            <input
                id="rotation-range"
                type="range"
                min={0}
                max={360}
                step={1}
                value={rotationDeg}
                onChange={(e) =>
                    dispatch({ type: 'setRotation', deg: Number.parseFloat(e.target.value) })
                }
            />
        </div>
    );
}
