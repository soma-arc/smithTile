import { useTileState } from '../../hooks/useTileState';
import { TRANSLATIONS } from '../../i18n';
import { COLOR } from '../../render/colors';

export function Legend() {
    const { lang, toggles } = useTileState();
    const t = TRANSLATIONS[lang];
    return (
        <div className="legend">
            <div className="legend-row">
                <svg width="26" height="0" style={{ overflow: 'visible' }} aria-hidden="true">
                    <line x1="0" y1="0" x2="26" y2="0" stroke={COLOR.aEdge} strokeWidth="3" />
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
                        stroke={COLOR.bEdge}
                        strokeWidth="3"
                        strokeDasharray="5 4"
                    />
                </svg>
                <span>{t.legendB}</span>
            </div>

            {toggles.showPorts && (
                <>
                    <div className="legend-row">
                        <svg
                            width="26"
                            height="0"
                            style={{ overflow: 'visible' }}
                            aria-hidden="true"
                        >
                            <circle
                                cx="8"
                                cy="0"
                                r="6"
                                fill="none"
                                stroke={COLOR.socketRing}
                                strokeWidth="2.4"
                            />
                        </svg>
                        <span>{t.legendSocket}</span>
                    </div>
                    <div className="legend-row">
                        <svg
                            width="26"
                            height="0"
                            style={{ overflow: 'visible' }}
                            aria-hidden="true"
                        >
                            <circle
                                cx="8"
                                cy="0"
                                r="6"
                                fill="none"
                                stroke={COLOR.plugRing}
                                strokeWidth="2.4"
                            />
                        </svg>
                        <span>{t.legendPlug}</span>
                    </div>
                </>
            )}
        </div>
    );
}
