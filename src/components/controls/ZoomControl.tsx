import { useTileDispatch, useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import { ZOOM_MAX, ZOOM_MIN } from '../../state/tileReducer';

export function zoomToSlider(zoom: number): number {
    return Math.log(zoom);
}

export function sliderToZoom(value: number): number {
    return Math.exp(value);
}

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
                min={zoomToSlider(ZOOM_MIN)}
                max={zoomToSlider(ZOOM_MAX)}
                step={0.01}
                value={zoomToSlider(zoom)}
                onChange={(e) =>
                    dispatch({
                        type: 'setZoom',
                        zoom: sliderToZoom(Number.parseFloat(e.target.value)),
                    })
                }
            />
        </div>
    );
}
