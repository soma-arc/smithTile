import { useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';

export function Legend() {
    const { lang } = useTileState();
    const t = TRANSLATIONS[lang];
    return (
        <div className="legend">
            <div className="legend-row">
                <svg width="26" height="0" style={{ overflow: 'visible' }} aria-hidden="true">
                    <line x1="0" y1="0" x2="26" y2="0" stroke="#5980a6" strokeWidth="3" />
                </svg>
                <span>{t.legendA}</span>
            </div>
            <div className="legend-row">
                <svg width="26" height="0" style={{ overflow: 'visible' }} aria-hidden="true">
                    <line
                        x1="0"
                        y1="0"
                        x2="26"
                        y2="0"
                        stroke="#1d2d3d"
                        strokeWidth="3"
                        strokeDasharray="5 4"
                    />
                </svg>
                <span>{t.legendB}</span>
            </div>
        </div>
    );
}
