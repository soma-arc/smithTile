import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';

export function ZoomControl() {
    const { lang, zoom } = useTileState();
    const dispatch = useTileDispatch();
    const t = TRANSLATIONS[lang];
    return (
        <div className="field" style={{ marginTop: 'var(--space-3)' }}>
            <label className="field-inline-label" htmlFor="zoom-range">
                <span>{t.zoom}</span> <span className="readout">{`${zoom.toFixed(2)}×`}</span>
            </label>
            <input
                id="zoom-range"
                type="range"
                min={0.35}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) =>
                    dispatch({ type: 'setZoom', zoom: Number.parseFloat(e.target.value) })
                }
            />
        </div>
    );
}
